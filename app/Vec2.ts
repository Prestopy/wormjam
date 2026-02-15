export class Vec2 {
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	add(other: Vec2): Vec2 {
		return new Vec2(this.x + other.x, this.y + other.y);
	}

	sub(other: Vec2): Vec2 {
		return new Vec2(this.x - other.x, this.y - other.y);
	}

	mul(scalar: number): Vec2 {
		return new Vec2(this.x * scalar, this.y * scalar);
	}

	mag(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	dist(other: Vec2): number {
		return this.sub(other).length();
	}

	constrain(scalar: number): Vec2 {
		const len = this.length();
		if (len === 0) return new Vec2(0, 0);
		const factor = scalar / len;
		return this.mul(factor);
	}

	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	normalize(): Vec2 {
		const len = this.length();
		if (len === 0) return new Vec2(0, 0);
		return new Vec2(this.x / len, this.y / len);
	}
}
