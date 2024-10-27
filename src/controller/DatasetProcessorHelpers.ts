import {InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import http from "http";
import Section from "./Section";
import fs from "fs";
import Room from "./Room";

// sources: https://stackoverflow.com/a/10262019, https://stackoverflow.com/a/6603043
// throws an error if id contains only whitespace, an underscore or already exists
async function validateID(id: string) {
	if (!/^[^_]+$/.test(id) || !id.replace(/\s/g, "").length) {
		throw new InsightError("Invalid form of dataset id");
	}
	const datasets = await listDatasets();
	if (datasets.map((dataset) => dataset.id).includes(id)) {
		throw new InsightError("Dataset with such id already exists");
	}
}

// source: https://stackoverflow.com/a/70208146
// returns an array of all the descendant nodes with the given name
function getDescendantsByNodeName (node: any, nodeName: string, tables: any): any {
	for (let i = 0; i < node.childNodes?.length; i++) {
		if (node.childNodes[i].nodeName === nodeName) {
			tables.push(node.childNodes[i]);
		}
		getDescendantsByNodeName(node.childNodes[i], nodeName, tables);
	}
	return tables;
}

function getRows (node: any, result: any[]): any {
	const queue: any[] = [];
	queue.push(node);
	while (queue.length > 0) {
		const currentNode: any = queue.shift();

		if (currentNode.nodeName === "tr") {
			result.push(currentNode);
		} else {
			if (currentNode.childNodes) {
				for (const child of currentNode.childNodes) {
					queue.push(child);
				}
			}
		}
	}
	return result;
}

function findNeededTable (node: any, className: string): any {
	const queue: any[] = [];
	queue.push(node);
	while (queue.length > 0) {
		const currentNode: any = queue.shift();

		if (currentNode.nodeName === "table") {
			if (checkTable(currentNode, className)) {
				return currentNode;
			}
		}

		if (currentNode.childNodes) {
			for (const child of currentNode.childNodes) {
				queue.push(child);
			}
		}

	}
	return null;
}

function getCellsFromRow (row: any, nodeName: string, result: any): any {
	const queue: any[] = [];
	queue.push(row);
	while (queue.length > 0) {
		const currentNode: any = queue.shift();

		if (currentNode.nodeName === nodeName) {
			result.push(currentNode);
		}

		if (result.length === 5) {
			return result;
		}

		if (currentNode.childNodes) {
			for (const child of currentNode.childNodes) {
				queue.push(child);
			}
		}
	}
	return result;
}

// returns the text from a node
function extractTextFromNode(node: any): any {
	if (node === undefined || !node) {
		return null;
	}
	const texts = node.childNodes.filter((child: any) => child.nodeName === "#text");
	if (texts.length !== 1) {
		console.log("Something is wrong with the table, parsing might have gone wrong");
		return "";
	}
	return texts[0].value.trim();
}

function checkTable(table: any, className: string): boolean {
	const td = getCellsFromRow(table, "td", []);
	return td.some(checkName);
	function checkName(t: any) {
		if (t.attrs[0]) {
			return (t.attrs[0].value === className);
		} else {
			return false;
		}
	}
}

// sources: http documentation, ChatGPT
// returns latitude and longitude (HttpRequest format) or an error
async function getGeolocationData(address: string) {
	return new Promise((resolve, reject) => {
		const ADDRESS = encodeURIComponent(address);
		const options = {
			hostname: "cs310.students.cs.ubc.ca",
			port: 11316,
			path: `/api/v1/project_team196/${ADDRESS}`,
			method: "GET"
		};

		const req = http.request(options, (res: any) => {
			let data = "";

			res.on("data", (chunk: any) => {
				data += chunk;
			});

			res.on("end", () => {
				resolve(data);
			});
		});

		req.on("error", (error: any) => {
			reject(error);
		});

		req.end();
	});
}

// Takes a json file and returns array of sections that you can use to query data
// done partially with the help of ChatGPT (return new Promise structure)
function getSections(returnedData: any) {
	const sectionsRead: Section[] = returnedData.map((sectionData: any) => {
		return new Section(
			sectionData.tier_eighty_five, sectionData.tier_ninety,
			sectionData.title, sectionData.section,
			sectionData.detail, sectionData.tier_seventy_two,
			sectionData.other, sectionData.low,
			sectionData.tier_sixty_four, sectionData.id,
			sectionData.tier_sixty_eight, sectionData.tier_zero,
			sectionData.tier_seventy_six, sectionData.tier_thirty,
			sectionData.tier_fifty, sectionData.professor,
			sectionData.audit, sectionData.tier_g_fifty,
			sectionData.tier_forty, sectionData.withdrew,
			sectionData.year, sectionData.tier_twenty,
			sectionData.stddev, sectionData.enrolled,
			sectionData.tier_fifty_five, sectionData.tier_eighty,
			sectionData.tier_sixty, sectionData.tier_ten,
			sectionData.high, sectionData.course,
			sectionData.session, sectionData.pass,
			sectionData.fail, sectionData.avg,
			sectionData.campus, sectionData.subject,
			sectionData.rank
		);
	});
	return sectionsRead;
}

function getRooms(returnedData: any) {
	const roomsRead: Room[] = returnedData.map((roomsData: any) => {
		return new Room(
			roomsData.fullname,
			roomsData.shortname,
			roomsData.number,
			roomsData.address,
			roomsData.lat,
			roomsData.lon,
			roomsData.seats,
			roomsData.type,
			roomsData.furniture,
			roomsData.href
		);
	});
	return roomsRead;
}

// accounts for possible delays in updating the directory
async function readDatasetFromDisk(fileName: string): Promise<any> {
	const datasets = await listDatasets();
	let kind: InsightDatasetKind;
	const dataset = datasets.find((data: InsightDataset) => data.id === fileName);
	if (dataset) {
		kind = dataset.kind;
	} else {
		throw new InsightError("Dataset doesn't exist");
	}
	// Function to attempt reading the file
	const data = await fs.promises.readFile(`./data/${fileName}.json`);
	return new Promise((resolve, reject) => {
		const returnedData = JSON.parse(data.toString());
		if (kind === InsightDatasetKind.Sections) {
			resolve(getSections(returnedData));
		} else {
			resolve(getRooms(returnedData));
		}
	});
}

// reads datasets from datasets.json, returns emptiness if the directory doesn't exist
async function listDatasets(): Promise<InsightDataset[]> {
	let datasets: InsightDataset[];
	try {
		const dataS = await fs.promises.readFile("./data/datasetsMeta.json");
		datasets = JSON.parse(dataS.toString()) as InsightDataset[];
		return datasets;
	} catch (error: any) {
		//
	}
	return [];
}

export {validateID, getDescendantsByNodeName, extractTextFromNode,
	checkTable, getGeolocationData, readDatasetFromDisk, getCellsFromRow, findNeededTable, getRows, listDatasets};
