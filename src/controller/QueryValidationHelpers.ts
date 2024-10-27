import {InsightError} from "./IInsightFacade";

export default class QueryValidationHelpers {
	public static ValidateKeyList(query: any): boolean {
		let output: boolean = true;
		let temp: any = Object.values(query);
		for (let key of temp) {
			output = output && (this.ValidateAnyKey(key));
		}
		return output;
	}

	// take in applyrule array
	// return 2d array representing map of applykeys to keys.
	public static ValidateApplyRuleList(query: any): string[][] {
		try {
			let output: any[][] = [];
			let temp: any = Object.values(query);
			let applyKeys: any[] = [];
			for (let applyRule of temp) {
				let applyKey: any = Object.keys(applyRule)[0];
				if (applyKeys.includes(applyKey)) {
					throw new InsightError("Failed to validate keys");
				}
				applyKeys.push(applyKey);
				let applyTokenKey: any = Object.values(applyRule)[0];
				let applyToken: any = Object.keys(applyTokenKey)[0];
				let key: any = Object.values(applyTokenKey)[0];
				if (!this.ValidateAnyKey(key) || !this.ValidateApplyToken(applyToken)) {
					throw new InsightError("Failed to validate keys");
				}
				let entry: any = [applyKey, key, applyToken];
				output.push(entry);
			}
			return output;
		} catch (e) {
			throw new InsightError("Failed to validate applyrules");
		}
	}

	public static ValidateAnyKey(query: string): boolean {
		return QueryValidationHelpers.ValidateIdStringRegex(query)
			&& (this.ValidateMKey(query) || this.ValidateSKey(query) || this.ValidateApplyKey(query));
	}

	public static ValidateApplyKey(query: string): boolean {
		return true;
	}

	public static ValidateMKey(query: string): boolean {
		return query.includes("_avg")
			|| query.includes("_pass")
			|| query.includes("_fail")
			|| query.includes("_audit")
			|| query.includes("_lat")
			|| query.includes("_lon")
			|| query.includes("_seats");
	}

	public static ValidateSKey(query: string): boolean {
		return query.includes("_dept")
			|| query.includes("_id")
			|| query.includes("_instructor")
			|| query.includes("_title")
			|| query.includes("_uuid")
			|| query.includes("_fullname")
			|| query.includes("_shortname")
			|| query.includes("_number")
			|| query.includes("_name")
			|| query.includes("_address")
			|| query.includes("_type")
			|| query.includes("_furniture")
			|| query.includes("_href");
	}

	public static ValidateApplyToken(query: string): boolean {
		return query === "MAX"
			|| query === "MIN"
			|| query === "AVG"
			|| query === "COUNT"
			|| query === "SUM";
	}

	// https://stackoverflow.com/questions/6603015/check-whether-a-string-matches-a-regex-in-js/6603043#6603043
	public static ValidateIdStringRegex (idString: string): boolean {
		return /[^_]+/.test(idString);
	}

	// make sure columns contains the order keys.
	public static ValidateSortColumns (columns: any[], order: any[]): boolean {
		let output: boolean = true;
		for (let key of order) {
			output = output && columns.includes(key);
		}
		return output;
	}

	// make sure contents in columns is equal to the union of applykeys and groups
	public static ValidateTransformationColumns (columns: any[], map: any[][], groups: any[]): boolean {
		let temp: any[] = [];
		for (let key of groups) {
			temp.push(key);
		}
		for (let apply of map) {
			temp.push(apply[0]);
		}
		// https://www.reddit.com/r/learnjavascript/comments/136sq2m/is_there_a_simple_or_fancy_way_to_check_if_two/
		return columns.every((item) => temp.includes(item));
	}
}
