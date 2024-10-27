import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import Section from "./Section";
import QueryValidationHelpers from "./QueryValidationHelpers";
import {readDatasetFromDisk} from "./DatasetProcessorHelpers";
import QueryTransformation from "./QueryTransformation";
import {BuildResult, BuildSField} from "./QueryExecutionHelpers";

export default class QueryHandler {

	private query: any; private LoadedSections: Section[][]; private LoadedIDStrings: string[];
	private curIDString: string; private sortUp: boolean; private sortDown: boolean; private sortKeys: string[];
	private hasTransformation: boolean; private applyMap: any[][];
	constructor() {
		this.LoadedSections = [];
		this.LoadedIDStrings = [];
		this.curIDString = "";
		this.sortUp = true;
		this.sortDown = false;
		this.sortKeys = [];
		this.hasTransformation = false;
		this.applyMap = [];
	}

	// return false if fail
	// return true if success
	public async Initialize(input: unknown): Promise<any> {
		// read query from file into appropriate objects
		// validate
		// let temp: string;
		// temp = await readJSON(input as string);
		// this.query = JSON.parse(input as string);
		this.query = input;
		this.curIDString = "";
		this.sortUp = true;
		this.sortDown = false;
		this.sortKeys = [];
		this.hasTransformation = false;
		this.applyMap = [];

		// return Promise.reject("not implemented");
		if (this.ValidateQuery()) {
			return Promise.resolve();
		} else {
			return Promise.reject(new InsightError("Incorrectly Formatted Query"));
		}
	}

	public async Execute(): Promise<InsightResult[]> {
		// execute a validly formatted query, checks for issues with dataset references/query size, returns array of results
		let output: InsightResult[] = [];
		// check column for IDSTRING to identify dataset in array (if different ID strings in list throw InsightError)
		// go through proper dataset array, apply filter to each in array (double check id string in filter against base)
		// filter by column list and sort by order in options (double check id string again)

		// get key, then isolate idString
		let key: any = Object.values(this.query["OPTIONS"])[0];
		key = key[0];
		let idString: string = key.substring(0, key.indexOf("_"));
		// check if data matching IDstring is already loaded
		let i: number = this.LoadedIDStrings.findIndex(
			(arrString) => {
				return arrString === idString;
			});
		let data: Section[];
		// if not, load, otherwise use loaded data
		if (i === -1) {
			data = await readDatasetFromDisk(idString);
			this.LoadedSections.push(data);
			this.LoadedIDStrings.push(idString);
		} 	else {
			data = this.LoadedSections[i];
		}

		this.curIDString = idString;

		// temporary variable to store filtered data
		// let temp: Section[] = [];

		// apply filter for each section in sections
		for (let section of data ) {
			if (this.ApplyFilter(section, this.query["WHERE"])) {
				let result: InsightResult = {};
				for (let column of this.query["OPTIONS"]["COLUMNS"]) {
					// if query is a transformation, fit applymap to column keys
					if (this.hasTransformation) {
						for (let map of this.applyMap) {
							if (map.indexOf(column) !== -1) {
								column = map[1];
							}
						}
					}
					BuildResult(column, result, section);
				}
				output.push(result);
			}
		}
		// apply transformation if needed
		if (this.hasTransformation) {
			output = QueryTransformation.applyTransformation(output, this.applyMap, this.query);
		}
		// sorting at end
		this.applySorting(output);
		if (output.length > 5000) {
			return Promise.reject(new ResultTooLargeError());
		}
		return Promise.resolve(output);
	}

	// https://stackoverflow.com/questions/43311121/sort-an-array-of-objects-in-typescript
	private applySorting(output: InsightResult[]) {
		if (Object.hasOwn(this.query["OPTIONS"], "ORDER")) {
			if (this.sortKeys.length === 1) {
				let SortProp: any = this.sortKeys[0];
				SortProp = SortProp as keyof InsightResult;
				if (this.sortUp) {
					output.sort((a, b) => (a[SortProp] <= b[SortProp] ? -1 : 1));
				} else if (this.sortDown) {
					output.sort((a, b) => (a[SortProp] > b[SortProp] ? -1 : 1));
				}
			} else {
				// same stackoverflow for function structure
				if (this.sortUp) {
					output.sort((a: InsightResult, b: InsightResult): number => {
						let sortOutput: number = 0;
						for (let SortProp of this.sortKeys) {
							if (a[SortProp] < b[SortProp]) {
								sortOutput = -1;
								break;
							} else if (a[SortProp] > b[SortProp]) {
								sortOutput = 1;
								break;
							}
						}
						return sortOutput;
					});
				} else if (this.sortDown) {
					output.sort((a: InsightResult, b: InsightResult): number => {
						let sortOutput: number = 0;
						for (let SortProp of this.sortKeys) {
							if (a[SortProp] > b[SortProp]) {
								sortOutput = -1;
								break;
							} else if (a[SortProp] < b[SortProp]) {
								sortOutput = 1;
								break;
							}
						}
						return sortOutput;
					});
				}
			}
		}
	}

	private ValidateQuery(): boolean {
		let output: boolean = false;
		// let hasTransformation: boolean = false;
		// optional transformations, validate and extract column keys
		let validatedTransformation = false;
		if(Object.hasOwn(this.query, "TRANSFORMATIONS")) {
			this.hasTransformation = true;
			validatedTransformation = this.ValidateTransformation(this.query["TRANSFORMATIONS"]);
		}
		if(Object.hasOwn(this.query, "WHERE") && Object.hasOwn(this.query, "OPTIONS")) {
			if (this.ValidateFilter(this.query["WHERE"]) && this.ValidateOptions(this.query["OPTIONS"])) {
				if (this.hasTransformation) {
					output = validatedTransformation && true;
				} else {
					output = true;
				}
			}
		}
		return output;
	}

	private ValidateFilter(query: any): boolean {
		let output:	boolean = false;
		// Base case
		if (Object.keys(query).length === 0) {
			output = true;
		}
		if (Object.keys(query).length !== 1 && Object.keys(query).length !== 0) {
			return false; // temp comment for pushing changes
		}
		// LComp
		if (Object.hasOwn(query, "AND") || Object.hasOwn(query, "OR")) {
			// console.log(Object.keys(query));
			// console.log(Object.keys(Object.values(query)[0]));
			let temp: any = Object.values(query)[0];
			output = true;
			for (let q of temp) {
				output = output && this.ValidateFilter(q);
			}
		}
		// Negation
		if (Object.hasOwn(query, "NOT")) {
			output = this.ValidateFilter(Object.values(query)[0] as any);
		}
		// MComp
		if (Object.hasOwn(query, "LT") || Object.hasOwn(query, "GT") || Object.hasOwn(query, "EQ")) {
			output = QueryValidationHelpers.ValidateMKey(Object.keys(Object.values(query)[0] as any)[0])
				&& (typeof Object.values(Object.values(query)[0] as any)[0] === "number");
		}
		// SComp
		if (Object.hasOwn(query, "IS")) {
			// Callie revisit: refine validating inputstring
			// confusing but checking for * * being on ends only
			output = QueryValidationHelpers.ValidateSKey(Object.keys(Object.values(query)[0] as any)[0])
				&& (typeof Object.values(Object.values(query)[0] as any)[0] === "string")
				&& (((Object.values(Object.values(query)[0] as any)[0] as string).indexOf("*", 1)
					=== (Object.values(Object.values(query)[0] as any)[0] as string).length - 1)
					|| ((Object.values(Object.values(query)[0] as any)[0] as string).indexOf("*", 1)
					=== -1));
		}
		return output;
	}

	private ValidateOptions(query: any): boolean {
		let output:	boolean = false;
		// 2 cases: Columns or Columns, ORDER: key
		if(Object.hasOwn(query, "COLUMNS")) {
			// validate key_list
			output = QueryValidationHelpers.ValidateKeyList(query["COLUMNS"]);
			if(Object.hasOwn(query, "ORDER")) {
				let hasDir: boolean = Object.hasOwn(query["ORDER"], "dir");
				let hasKeys: boolean = Object.hasOwn(query["ORDER"], "keys");
				if(hasDir && hasKeys) {
					output = output
						&& (query["ORDER"]["dir"] === "UP") || (query["ORDER"]["dir"] === "DOWN")
						&& (QueryValidationHelpers.ValidateKeyList(query["ORDER"]["keys"]));
					if (query["ORDER"]["dir"] === "UP") {
						this.sortUp = true;
						this.sortDown = false;
					} else if (query["ORDER"]["dir"] === "DOWN") {
						this.sortUp = false;
						this.sortDown = true;
					}
					let i: number = 0;
					let temp: any = Object.values(query["ORDER"]["keys"]);
					for (let key of temp) {
						this.sortKeys[i] = key as string;
						i++;
					}
				} else if(!hasDir && !hasKeys) {
					output = output && (QueryValidationHelpers.ValidateAnyKey(query["ORDER"]));
					this.sortKeys[0] = Object.values(this.query["OPTIONS"])[1] as string;
				}
				output = output && QueryValidationHelpers.ValidateSortColumns(query["COLUMNS"], this.sortKeys);
			}
			if (this.hasTransformation) {
				output = output && QueryValidationHelpers.ValidateTransformationColumns(query["COLUMNS"], this.applyMap,
					this.query["TRANSFORMATIONS"]["GROUP"]);
			}
		}
		return output;
	}

	private ValidateTransformation(query: any): boolean {
		let output = false;
		if (Object.hasOwn(query, "GROUP") && Object.hasOwn(query, "APPLY")) {
			output = QueryValidationHelpers.ValidateKeyList(query["GROUP"]);
			this.applyMap = QueryValidationHelpers.ValidateApplyRuleList(query["APPLY"]);
		}
		return output;
	}

	private ApplyFilter(section: Section, query: any): boolean {
		let output:	boolean = true;
		// Base case
		if (Object.keys(query).length === 0) {
			output = true;
		}
		// LComp
		if (Object.hasOwn(query, "AND")) {
			let temp: any = Object.values(query)[0];
			output = this.ApplyFilter(section, temp[0]);
			for (let q of temp) {
				output = output && this.ApplyFilter(section, q);
			}
		}
		if (Object.hasOwn(query, "OR")) {
			let temp: any = Object.values(query)[0];
			output = this.ApplyFilter(section, temp[0]);
			for (let q of temp) {
				output = output || this.ApplyFilter(section, q);
			}
		}
		// Negation
		if (Object.hasOwn(query, "NOT")) {
			output = !this.ApplyFilter(section, Object.values(query)[0]);
		}
		// MComp
		// https://stackoverflow.com/questions/57086672/element-implicitly-has-an-any-type-because-expression-of-type-string-cant-b
		if (Object.hasOwn(query, "LT") || Object.hasOwn(query, "GT") || Object.hasOwn(query, "EQ")) {
			output = this.MCompareCase(query, output, section);
		}
		// SComp
		if (Object.hasOwn(query, "IS")) {
			output = this.SKeyCase(query, output, section);
		}
		return output;
	}

	private SKeyCase(query: any, output: boolean, section: Section) {
		let skey: string = Object.keys(Object.values(query)[0] as any)[0];
		let idstring: string = skey.substring(0, skey.indexOf("_"));
		if (idstring !== this.curIDString) {
			throw new InsightError("Multiple datasets referenced in query");
		}
		let sfield = BuildSField(skey);
		let string: any = Object.values(Object.values(query)[0] as any)[0];
		// https://www.spguides.com/typescript-check-if-a-string-contains-a-substring/
		let tempstr: string  = section[sfield] as string;
		if (sfield === "id") {
			tempstr = "" + tempstr + "";
		}
		if (string[0] === "*" && string[string.length - 1] === "*") {
			string = string.substring(1, string.length - 1);
			return output && ((tempstr).includes(string as string));
		} else if (string[0] === "*") {
			string = string.substring(1, string.length);
			return output && ((tempstr).indexOf(string as string, (tempstr).length - string.length)
				=== (tempstr).length - string.length)
				&& ((tempstr).indexOf(string as string) !== -1);
		} else if (string[string.length - 1] === "*") {
			string = string.substring(0, string.length - 1);
			return output && ((tempstr).indexOf(string as string)
				=== 0);
		} else {
			return output && (section[sfield] === string);
		}
	}

	private MCompareCase(query: any, output: boolean, section: Section) {
		let mkey: string = Object.keys(Object.values(query)[0] as any)[0];
		let idstring: string = mkey.substring(0, mkey.indexOf("_"));
		if (idstring !== this.curIDString) {
			throw new InsightError("Multiple datasets referenced in query");
		}
		let mfield = mkey.substring(mkey.indexOf("_") + 1) as keyof Section;
		let value: any = Object.values(Object.values(query)[0] as any)[0];
		if (Object.hasOwn(query, "LT")) {
			output = output && (section[mfield] < value);
		}
		if (Object.hasOwn(query, "GT")) {
			output = output && (section[mfield] > value);
		}
		if (Object.hasOwn(query, "EQ")) {
			output = output && (section[mfield] === value);
		}
		return output;
	}
}
/*
enum MField {
	AVG = "avg",
	PASS = "pass",
	FAIL = "fail",
	AUDIT = "audit",
	YEAR = "year"
}

enum SField {
	DEPT = "dept",
	ID = "id",
	INSTRUCTOR = "instructor",
	TITLE = "title",
	UUID = "uuid"
}
*/
/*
interface IDString {
	IDSTRING: "/[^_]+/"
}
interface MField {
	AVG: "avg",
	PASS: "pass",
	FAIL: "fail",
	AUDIT: "audit",
	YEAR: "year"
}

interface SField {
	DEPT: "dept",
	ID: "id",
	INSTRUCTOR: "instructor",
	TITLE: "title",
	UUID: "uuid"
}
interface MKey {
	MKEY: "'" + IDString
}
*/
