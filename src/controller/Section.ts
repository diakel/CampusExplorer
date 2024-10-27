import Course from "./Course";

export default class Section extends Course {
	public readonly tier_eighty_five: number;
	public readonly tier_ninety: number;
	public readonly title: string;
	public readonly section: string;
	public readonly detail: string;
	public readonly tier_seventy_two: number;
	public readonly other: number;
	public readonly low: number;
	public readonly tier_sixty_four: number;
	public readonly id: number;
	public readonly tier_sixty_eight: number;
	public readonly tier_zero: number;
	public readonly tier_seventy_six: number;
	public readonly tier_thirty: number;
	public readonly tier_fifty: number;
	public readonly professor: string;
	public readonly audit: number;
	public readonly tier_g_fifty: number;
	public readonly tier_forty: number;
	public readonly withdrew: number;
	public readonly year: string;
	public readonly tier_twenty: number;
	public readonly stddev: number;
	public readonly enrolled: number;
	public readonly tier_fifty_five: number;
	public readonly tier_eighty: number;
	public readonly tier_sixty: number;
	public readonly tier_ten: number;
	public readonly high: number;
	public readonly course: string;
	public readonly session: string;
	public readonly pass: number;
	public readonly fail: number;
	public readonly avg: number;
	public readonly campus: string;
	public readonly subject: string;

	constructor(tier_eighty_five: number, tier_ninety: number, title: string, section: string, detail: string,
		tier_seventy_two: number, other: number, low: number, tier_sixty_four: number, id: number,
		tier_sixty_eight: number, tier_zero: number, tier_seventy_six: number, tier_thirty: number, tier_fifty: number,
		professor: string, audit: number, tier_g_fifty: number, tier_forty: number, withdrew: number, year: string,
		tier_twenty: number, stddev: number, enrolled: number, tier_fifty_five: number, tier_eighty: number,
		tier_sixty: number, tier_ten: number, high: number, course: string, session: string, pass: number,
		fail: number, avg: number, campus: string, subject: string, rank: number) {
		super(rank);
		this.tier_eighty_five = tier_eighty_five;
		this.tier_ninety = tier_ninety;
		this.title = title;
		this.section = section;
		this.detail = detail;
		this.tier_seventy_two = tier_seventy_two;
		this.other = other;
		this.low = low;
		this.tier_sixty_four = tier_sixty_four;
		this.id = id;
		this.tier_sixty_eight = tier_sixty_eight;
		this.tier_zero = tier_zero;
		this.tier_seventy_six = tier_seventy_six;
		this.tier_thirty = tier_thirty;
		this.tier_fifty = tier_fifty;
		this.professor = professor;
		this.audit = audit;
		this.tier_g_fifty = tier_g_fifty;
		this.tier_forty = tier_forty;
		this.withdrew = withdrew;
		this.year = year;
		this.tier_twenty = tier_twenty;
		this.stddev = stddev;
		this.enrolled = enrolled;
		this.tier_fifty_five = tier_fifty_five;
		this.tier_eighty = tier_eighty;
		this.tier_sixty = tier_sixty;
		this.tier_ten = tier_ten;
		this.high = high;
		this.course = course;
		this.session = session;
		this.pass = pass;
		this.fail = fail;
		this.avg = avg;
		this.campus = campus;
		this.subject = subject;
	}
}
