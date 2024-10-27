import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";

import {assert, expect} from "chai";
import request, {Response} from "supertest";
import {InsightDatasetKind} from "../../src/controller/IInsightFacade";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import fs from "fs-extra";

describe("Facade D3", function () {

	this.timeout(500000 );
	let testFacade: InsightFacade;
	let server: Server;

	before(async function () {
		await clearDisk();
		testFacade = new InsightFacade();
		server = new Server(4321);
		// server.start().then().catch((e: unknown) => {
		//	expect.fail("Error starting server");
		// });
		// start server
		try {
			await server.start();
			console.log("Started server successfully");
		} catch (e: unknown) {
			throw new Error("Failed to start server");
		}
	});

	after(async function () {

		// stop server
		try {
			await server.stop();
			console.log("Stopped server successfully");
		} catch (e: unknown) {
			throw new Error("Failed to stop server");
		}
	});

	beforeEach(async function () {
		await clearDisk();
		console.log("\nNEW TEST");
	});

	afterEach(function () {
		console.log("TEST COMPLETE\n");
	});

	// Call this before starting the frontend
	it("add a dataset", async function() {
		let rooms: string = await getContentFromArchives("campus.zip");
		await testFacade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
	});

	it("echo test", function() {
		try {
			return request("http://localhost:4321")
				.get("/echo/hello")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("echo failed");
		}
	});

	it("invalid put test", async function() {
		let sectionsRaw: any = await fs.readFile("test/resources/archives/pair_invalid.zip");
		try {
			return request("http://localhost:4321")
				.put("/dataset/sectionsData/sections")
				.send(sectionsRaw)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					let temp = res.status;
					let temp2 = res.body.error;
					expect(res.status).to.be.equal(400);
					expect(res.body.error).to.be.a("string");
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("put failed");
		}
	});

	it("valid put test", async function() {
		let sectionsRaw: any = await fs.readFile("test/resources/archives/pair.zip");
		// let sections: string = await getContentFromArchives("pair.zip");
		// await testFacade.addDataset("expectedSectionsData", sections, InsightDatasetKind.Sections);
		let expectedResult = ["sectionsData"];
		try {
			return request("http://localhost:4321")
				.put("/dataset/sectionsData/sections")
				.send(sectionsRaw)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					let temp = res.body.result;
					expect(temp).to.be.deep.equal(expectedResult);
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("put failed");
		}
	});

	it("not found remove test", async function() {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/sectionsData")
				.then(function (res: Response) {
					let temp = res.status;
					let temp2 = res.body.error;
					expect(res.status).to.be.equal(404);
					expect(res.body.error).to.be.a("string");
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("delete failed");
		}
	});

	it("invalid remove test", async function() {
		try {
			return request("http://localhost:4321")
				.delete("/dataset/_____")
				.then(function (res: Response) {
					let temp = res.status;
					let temp2 = res.body.error;
					expect(res.status).to.be.equal(400);
					expect(res.body.error).to.be.a("string");
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("delete failed");
		}
	});

	it("valid delete test", async function() {
		let sections: string = await getContentFromArchives("pair.zip");
		await testFacade.addDataset("sectionsData", sections, InsightDatasetKind.Sections);
		let expectedResult = "sectionsData";
		try {
			return request("http://localhost:4321")
				.delete("/dataset/sectionsData")
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					let temp = res.body.result;
					expect(temp).to.be.deep.equal(expectedResult);
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("delete failed");
		}
	});

	it("invalid post test", async function() {
		// let sections: string = await getContentFromArchives("pair.zip");
		// await testFacade.addDataset("sections", sections, InsightDatasetKind.Sections);
		const queryFile: any = fs.readJSONSync("test/resources/queries/section_valid/simple.json");
		let query = queryFile.input;
		// let expectedResult = await testFacade.performQuery(query);
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(query)
				.then(function (res: Response) {
					expect(res.status).to.be.equal(400);
					expect(res.body.error).to.be.a("string");
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("delete failed");
		}
	});

	it("valid post test", async function() {
		let sections: string = await getContentFromArchives("pair.zip");
		await testFacade.addDataset("sections", sections, InsightDatasetKind.Sections);
		const queryFile: any = fs.readJSONSync("test/resources/queries/section_valid/simple.json");
		let query = queryFile.input;
		let expectedResult = await testFacade.performQuery(query);
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(query)
				.then(function (res: Response) {
					expect(res.status).to.be.equal(200);
					let temp = res.body.result;
					expect(temp).to.be.deep.equal(expectedResult);
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("delete failed");
		}
	});

	it("get test", async function() {
		let sections: string = await getContentFromArchives("pair.zip");
		await testFacade.addDataset("sectionsData", sections, InsightDatasetKind.Sections);
		let expectedResult = await testFacade.listDatasets();
		try {
			return request("http://localhost:4321")
				.get("/datasets")
				.then(function (res: Response) {
					let temp = res.status;
					let temp2 = res.body.error;
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.deep.equal(expectedResult);
				})
				.catch(function (err) {
					assert.fail();
				});
		} catch (e) {
			assert.fail("get failed");
		}
	});

	// Sample on how to format PUT requests
	/*
	it("PUT test for courses dataset", function () {
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
		}
	});
	*/

	// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
});
