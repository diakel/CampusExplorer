import {IInsightFacade, InsightDatasetKind, InsightError, NotFoundError} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives, readFileQueries} from "../TestUtil";
import {readdir} from "node:fs";

use(chaiAsPromised);

export interface ITestQuery {
	title: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

// please, run the test suites all together
describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let sectionsSmall: string;
	let rooms: string;
	let roomsSmall: string;
	let roomsLarge: string;
	let roomsModified: string;
	let sectionsEmpty: string;
	let sectionsInvalid: string;
	let roomsInvalid: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		sectionsSmall = await getContentFromArchives("courses_subset.zip");
		roomsSmall = await getContentFromArchives("campus_subset.zip");
		rooms = await getContentFromArchives("campus.zip");
		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});


	describe("AddDataset", function () {
		this.timeout(5000);

		before(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			facade = new InsightFacade();
		});

		after(async function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			await clearDisk();
		});

		it("should reject with  an empty dataset id", async function () {
			const result = facade.addDataset("", sectionsSmall, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an id of only whitespaces", async function () {
			const result = facade.addDataset("      ", sectionsSmall, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject with an id containing underscore", async function () {
			const result = facade.addDataset("ubc_pair", sectionsSmall, InsightDatasetKind.Sections);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});


		// a valid dataset but with some missing data (not all rooms should be parsed)
		it("should accept a dataset with 9 rooms", async function () {
			const roomsLess = await getContentFromArchives("campus_less_rooms.zip");
			await facade.addDataset("ubc rooms less", roomsLess, InsightDatasetKind.Rooms);
			const data = await facade.listDatasets();

			return expect(data).to.deep.equal([{id: "ubc rooms less", kind: "rooms", numRows: 9}]);
		});

		it("should reject with an already existing id", async function () {
			await facade.addDataset("ubc add", sectionsSmall, InsightDatasetKind.Sections);
			const result = facade.addDataset("ubc add", sectionsSmall, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should add a sections dataset", async function () {
			const result = await facade.addDataset("ubc pair", sections, InsightDatasetKind.Sections);

			return expect(result.slice(-1)[0]).to.equal("ubc pair");
		});

		it("should reject sections dataset with no sections", async function () {
			sectionsEmpty = await getContentFromArchives("pair_empty.zip");
			const result = facade.addDataset("ubc empty", sectionsEmpty, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject invalid sections dataset", async function () {
			sectionsInvalid = await getContentFromArchives("pair_invalid.zip");
			const result = facade.addDataset("ubc invalid", sectionsInvalid, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should accept a valid rooms dataset", async function () {
			const result = await facade.addDataset("ubc rooms", rooms, InsightDatasetKind.Rooms);

			return expect(result.slice(-1)[0]).to.equal("ubc rooms");
		});

		it("should accept a valid rooms dataset with pages having more than 1 table", async function () {
			roomsModified = await getContentFromArchives("campus_mod.zip");
			const result = await facade.addDataset("ubc rooms 2", roomsModified, InsightDatasetKind.Rooms);

			return expect(result.slice(-1)[0]).to.deep.equal("ubc rooms 2");
		});

		it("should reject an invalid rooms dataset", async function () {
			roomsInvalid = await getContentFromArchives("campus_invalid.zip");
			const result = facade.addDataset("ubc rooms invalid", roomsInvalid, InsightDatasetKind.Rooms);

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("RemoveDataset", function () {
		this.timeout(10000);

		before(async function () {
			facade = new InsightFacade();
			await facade.addDataset("ubc to remove", sectionsSmall, InsightDatasetKind.Sections);
			await facade.addDataset("ubc to remove 2", roomsSmall, InsightDatasetKind.Rooms);
		});

		after(async function () {
			await clearDisk();
		});

		it("should reject with an non-existent id", async function () {
			const result = facade.removeDataset("ubc bla bla bla");

			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject with  an invalid id", async function () {
			const result = facade.removeDataset("");

			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should remove a sections dataset", async function () {
			const result = await facade.removeDataset("ubc to remove");
			return expect(result).to.equal("ubc to remove");
		});

		// basically testing data persistence
		it("should remove a sections dataset even with a new instance of InsightFacade", async function () {
			const newFacade = new InsightFacade();
			const result = await newFacade.removeDataset("ubc to remove 2");
			return expect(result).to.equal("ubc to remove 2");
		});

		/*
		it("should remove a sections dataset several times", async function () {
			const newFacade = new InsightFacade();
			await newFacade.addDataset("ubc new", sectionsSmall, InsightDatasetKind.Sections);
			const newNewFacade = new InsightFacade();
			await newNewFacade.addDataset("ubc new 2", sectionsSmall, InsightDatasetKind.Sections);
			await newNewFacade.removeDataset("ubc new 2");
			const datasetTest = await newNewFacade.listDatasets();
			expect(datasetTest).to.deep.equal([
				{id: "ubc new", kind: "sections", numRows: 174}
			]);
		});
		 */
	});

	describe("ListDataset", function () {
		this.timeout(10000);

		before(async function () {
			facade = new InsightFacade();
			await facade.addDataset("ubc", sectionsSmall, InsightDatasetKind.Sections);
		});

		after(async function () {
			await clearDisk();
		});

		it("should list all the datasets", async function () {
			const result = facade.listDatasets();

			return expect(result).to.eventually.deep.equal([
				{id: "ubc", kind: "sections", numRows: 174}
			]);
		});

		it("should return empty after remove", async function () {
			await facade.removeDataset("ubc");
			const result = facade.listDatasets();

			return expect(result).to.eventually.deep.equal([]);
		});

		it("should list several sections datasets", async function () {
			await facade.addDataset("ubc list 2", sectionsSmall, InsightDatasetKind.Sections);
			await facade.addDataset("ubc list 3", sectionsSmall, InsightDatasetKind.Sections);
			const result = facade.listDatasets();

			return expect(result).to.eventually.deep.equal([
				{id: "ubc list 2", kind: "sections", numRows: 174},
				{id: "ubc list 3", kind: "sections", numRows: 174}
			]);
		});

		it("should return after new instance", async function () {
			const newFacade = new InsightFacade();
			const result = newFacade.listDatasets();

			return expect(result).to.eventually.deep.equal([
				{id: "ubc list 2", kind: "sections", numRows: 174},
				{id: "ubc list 3", kind: "sections", numRows: 174}
			]);
		});

		it("should list all after remove and new instance", async function () {
			const newFacade = new InsightFacade();
			await newFacade.addDataset("ubc list 4", sectionsSmall, InsightDatasetKind.Sections);
			const newNewFacade = new InsightFacade();
			await newNewFacade.removeDataset("ubc list 2");
			const result = newNewFacade.listDatasets();

			return expect(result).to.eventually.deep.equal([
				{id: "ubc list 3", kind: "sections", numRows: 174},
				{id: "ubc list 4", kind: "sections", numRows: 174}
			]);
		});

		it("should list rooms and sections datasets", async function () {
			const newFacade = new InsightFacade();
			await newFacade.addDataset("ubc rooms", roomsSmall, InsightDatasetKind.Rooms);
			const result = newFacade.listDatasets();

			return expect(result).to.eventually.deep.equal([
				{id: "ubc list 3", kind: "sections", numRows: 174},
				{id: "ubc list 4", kind: "sections", numRows: 174},
				{id: "ubc rooms", kind: "rooms", numRows: 12}
			]);
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You can and should still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", function () {
		this.timeout(15000);
		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			let loadDatasetPromises = [await facade.addDataset("sections", sections, InsightDatasetKind.Sections)];
			// load rooms dataset too
			loadDatasetPromises.push(await facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms));
			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		describe("valid section queries", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("section_valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							// console.log(result);
							// assert.fail("Write your assertions here!");
							expect(result).to.have.deep.members(test.expected);
							// console.log(result[0]);
							// console.log("blank");
							// console.log(test.expected[0]);
							// expect(res1).to.deep.equal
						})
						.catch((err: any) => {
							assert.fail(`performQuery threw unexpected error: ${err}`);
						});
				});
			});
		});

		describe("valid room queries", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("room_valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							// console.log(result);
							// assert.fail("Write your assertions here!");
							expect(result).to.have.deep.members(test.expected);
							// console.log(result[0]);
							// console.log("blank");
							// console.log(test.expected[0]);
							// expect(res1).to.deep.equal
						})
						.catch((err: any) => {
							assert.fail(`performQuery threw unexpected error: ${err}`);
						});
				});
			});
		});
		describe("valid sorting queries", function () {
			let validQueries: ITestQuery[];
			try {
				validQueries = readFileQueries("sort_valid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			validQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							// console.log(result);
							// assert.fail("Write your assertions here!");
							// expect(result).to.have.deep.members(test.expected);
							// console.log(result[0]);
							// console.log("blank");
							// console.log(test.expected[0]);
							expect(result).to.deep.equal(test.expected);
						})
						.catch((err: any) => {
							assert.fail(`performQuery threw unexpected error: ${err}`);
						});
				});
			});
		});
		describe("invalid queries", function () {
			let invalidQueries: ITestQuery[];

			try {
				invalidQueries = readFileQueries("invalid");
			} catch (e: unknown) {
				expect.fail(`Failed to read one or more test queries. ${e}`);
			}

			invalidQueries.forEach(function (test: any) {
				it(`${test.title}`, function () {
					return facade
						.performQuery(test.input)
						.then((result) => {
							assert.fail(`performQuery resolved when it should have rejected with ${test.expected}`);
						})
						.catch((err: any) => {
							if (test.expected === "InsightError") {
								expect(err).to.be.instanceOf(InsightError);
							} else {
								assert.fail("QueryHandler threw unexpected error");
							}
						});
				});
			});
		});
	});
});
