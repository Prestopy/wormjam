export function getR(r: number, h: number) {
	return (r % h + h) % h;
}

export function getC(c: number, w: number) {
	return (c % w + w) % w;
}

export function inRad(degree: number): number {
	return degree * Math.PI / 180;
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
