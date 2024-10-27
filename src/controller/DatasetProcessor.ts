import Section from "./Section";
import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import * as fs from "fs";
import Room from "./Room";
import * as parse5 from "parse5";
import {
	extractTextFromNode,getGeolocationData,
	validateID, findNeededTable, getRows
} from "./DatasetProcessorHelpers";

let sections: Section[];
let roomsFull: Room[];

export default class DatasetProcessor {
	constructor() {
		// console.log("Data is being processed");
	}

	public async processData(id: string, content: string, kind: InsightDatasetKind) {
		// datasets = data;
		await validateID(id);
		sections = [];
		roomsFull = [];
		await this.convertZipToArray(id, content, kind);
		if (kind === "rooms") {
			return roomsFull;
		}
		return sections;
	}

	// sources: JSZip documentation, JSON parse tutorial, https://stackoverflow.com/a/16317628
	// takes a dataset id and zip encoded as base64 string, creates an array of sections, writes this array as a Json file
	private async convertZipToArray(id: string, content: string, kind: InsightDatasetKind) {
		// get the string back into a buffer format
		const promises: Array<Promise<void>> = [];
		const data = Buffer.from(content, "base64");
		let dataToWrite: Section[] | Room[] = [];
		let JSZip = require("jszip");
		try {
			// unpack the zip file into JSZip format
			const zip = await JSZip.loadAsync(data);
			if (kind === "sections") {
				await this.parseZipToSections(zip);
				dataToWrite = sections;
			} else if (kind === "rooms") {
				await this.parseZipToBuildings(zip, "index.htm");
				dataToWrite = roomsFull;
			}
			if (!sections.length && !roomsFull.length) {
				throw new InsightError("Invalid dataset: no valid sections/rooms");
			}
			// writing sections to file, creating directory if it doesn't exist
			const promise = new Promise<void>((resolve, reject) => {
				fs.mkdir("./data", {recursive: true}, function (err) {
					if (err) {
						console.log(err);
						reject();
					}
					fs.writeFile("./data/" + id + ".json", JSON.stringify(dataToWrite, null, 2), (err_5: any) => {
						if (err_5) {
							console.error(err_5);
							reject();
						}
						resolve();
					});
				});
			});
			promises.push(promise);
			await Promise.all(promises);
		} catch (error) {
			throw new InsightError("Invalid dataset: check that it's a zip file and has valid sections/rooms");
		}
	}

	// if building var is true, parses index into buildings information
	private async parseZipToBuildings(zip: any, fileName: string): Promise<Room[]> {
		const page = zip.file(fileName);
		if (!page) {
			return [];
		}
		return new Promise((resolve, reject) => {
			page.async("string").then((indexPage: any) => {
				let result: Room[] = [];
				const promises: Array<Promise<void>> = [];
				const indexContent = parse5.parse(indexPage);
				const table = findNeededTable(indexContent, "views-field views-field-title");
				if (table) {
					this.parseTableIntoBuildings(table, zip).then((rooms: Room[]) => {
						result = rooms;
						resolve(result);
					}).catch((error: any) => {
						reject();
					});
				}
			}).catch(() => {
				throw new InsightError("No index page");
			});
		});
	}

	private async parseTableIntoBuildings(table: any, zip: any): Promise<Room[]> {
		return new Promise((resolve, reject) => {
			const rows = getRows(table, []);
			// console.log(table.childNodes[3]?.childNodes);
			const promises: Array<Promise<void>> = [];
			roomsFull = [];
			for (const row of rows) {
				let path = "";
				let shortname: any = null;
				let fullname: any = null;
				let address: any = null;
				// const cells = getCellsFromRow(row, "td", []);
				const cells = row.childNodes.filter((child: any) => child.nodeName === "td");
				if (cells.length > 0) {
					const fullnameCell = cells.find(
						(cell: any) => cell.attrs[0].value === "views-field views-field-title"
					);
					const linkNode = fullnameCell.childNodes.find((child: any) => child.nodeName === "a");
					fullname = extractTextFromNode(linkNode);
					path = linkNode?.attrs[0].value.trim().replace(/^\.\//, "");
					shortname = extractTextFromNode(
						cells.find((cell: any) => cell.attrs[0].value === "views-field views-field-field-building-code")
					);
					address = extractTextFromNode(
						cells.find(
							(cell: any) => cell.attrs[0]?.value === "views-field views-field-field-building-address"
						)
					);
					if (shortname !== null && fullname !== null && address !== null && path !== "") {
						const promise = new Promise<void>((resolvePromise, rejectPromise) => {
							this.parseZipToRooms(zip, path, address, fullname, shortname)
								.then((theseRooms: any[]) => {
									resolvePromise();
								})
								.catch((error: any) => {
									resolvePromise();
								});
						}).catch((error: any) => {
							throw new InsightError();
						});
						promises.push(promise);
					}
				}
			}
			Promise.all(promises).then(() => {
				resolve(roomsFull);
			}).catch((error: any) => {
				reject();
			});
		});
	}

	// fills final room array with all the information
	private async fillRoomsArray(path: string, zip: any, address: string,
		fullname: string, shortname: string, promises: Array<Promise<void>>)  {
		const promise = new Promise<void>((resolvePromise, rejectPromise) => {
			this.parseZipToRooms(zip, path, address, fullname, shortname)
				.then((theseRooms: any[]) => {
					resolvePromise();
				})
				.catch((error: any) => {
					resolvePromise();
				});
		}).catch((error: any) => {
			throw new InsightError();
		});
		return promise;
	}

	private async parseZipToRooms(zip: any, fileName: string, address: string,
		fullname: string, shortname: string): Promise<any[]> {
		const page = zip.file(fileName);
		if (!page) {
			return [];
		}
		return new Promise((resolve, reject) => {
			page.async("string").then((pageContent: any) => {
				const indexContentNode = parse5.parse(pageContent);
				const table = findNeededTable(indexContentNode, "views-field views-field-field-room-number");
				let lat = null;
				let lon = null;
				getGeolocationData(address).then((geoData: any) => {
					if ("error" in JSON.parse(geoData)) {
						reject();
						return;
					}
					lat = JSON.parse(geoData).lat;
					lon = JSON.parse(geoData).lon;
					if (table) {
						roomsFull = this.parseTableIntoRooms(table, lat, lon, address, fullname, shortname);
					}
					resolve(roomsFull);
				}).catch(() => {
					reject();
				});
			}).catch(() => {
				reject();
			});
		});
	}

	// parses given table into rooms but information is not full yet
	private parseTableIntoRooms(
		table: any,
		lat: number,
		lon: number,
		address: string,
		fullname: string,
		shortname: string): Room[] {
		const rows = getRows(table, []);
		for (const row of rows) {
			let rNumber = null;
			let seats = null;
			let type = null;
			let furniture = null;
			let href = null;
			// const cells = getCellsFromRow(row, "td", []);
			const cells = row.childNodes.filter((child: any) => child.nodeName === "td");
			if (cells.length > 0) {
				const numberCell = cells.find(
					(cell: any) => cell.attrs[0].value === "views-field views-field-field-room-number"
				);
				const linkNode = numberCell?.childNodes.find((child: any) => child.nodeName === "a");
				rNumber = extractTextFromNode(linkNode);
				href = linkNode?.attrs[0].value.trim();
				seats = extractTextFromNode(
					cells.find((cell: any) => cell.attrs[0].value === "views-field views-field-field-room-capacity")
				);
				furniture = extractTextFromNode(
					cells.find(
						(cell: any) => cell.attrs[0].value === "views-field views-field-field-room-furniture"
					)
				);
				type = extractTextFromNode(
					cells.find((cell: any) => cell.attrs[0].value === "views-field views-field-field-room-type")
				);
				if (rNumber !== null && seats !== null && type !== null &&
					furniture !== null && href !== null && lat !== null && lon !== null) {
					const room: Room = new Room(fullname, shortname, rNumber,
						address, lat, lon, Number(seats), type, furniture, href);
					roomsFull.push(room);
				}
			}
		}
		return roomsFull;
	}

// parses the zip file into an array of sections, promises are here to ensure that sections array is full before writing it to disk
	// Promises.all syntax is done with ChatGPT, also used JSZip documentation
	private async parseZipToSections(zip: any): Promise<Section[]> {
		return new Promise((resolve, reject) => {
			const promises: Array<Promise<void>> = [];
			// iterating through each file in the zip
			zip.forEach(function (relativePath: string, zipEntry: any) {
				const promise = new Promise<void>((resolvePromise, rejectPromise) => {
					// getting the contents of the file in a string format
					zipEntry.async("string").then((courseFile: any) => {
						const courseJSON = JSON.parse(courseFile);
							// getting all the sections from the json file
						const sectionsData = courseJSON.result;
							// creating new sections for each section in the json file
						for (const sectionData of sectionsData) {
							const section = new Section(sectionData.tier_eighty_five,
								sectionData.tier_ninety, sectionData.Title,
								sectionData.Section, sectionData.Detail,
								sectionData.tier_seventy_two, sectionData.Other,
								sectionData.Low, sectionData.tier_sixty_four,
								sectionData.id, sectionData.tier_sixty_eight,
								sectionData.tier_zero, sectionData.tier_seventy_six,
								sectionData.tier_thirty, sectionData.tier_fifty,
								sectionData.Professor, sectionData.Audit,
								sectionData.tier_g_fifty, sectionData.tier_forty,
								sectionData.Withdrew, sectionData.Year,
								sectionData.tier_twenty, sectionData.Stddev,
								sectionData.Enrolled, sectionData.tier_fifty_five,
								sectionData.tier_eighty, sectionData.tier_sixty, sectionData.tier_ten,
								sectionData.High, sectionData.Course,
								sectionData.Session, sectionData.Pass,
								sectionData.Fail, sectionData.Avg,
								sectionData.Campus, sectionData.Subject,
								courseJSON.rank);
							sections.push(section);
						}
							// once sections from one course are parsed, we can resolve the promise
						resolvePromise();
					}).catch((error: any) => {
							// some sections would be invalid: it's okay
						resolvePromise();
					});
				});
				promises.push(promise);
			});
			// waiting for all promises to resolve before returning sections
			Promise.all(promises)
				.then(() => {
					resolve(sections);
				})
				.catch((error) => {
					reject(error);
				});
		});
	}
}
