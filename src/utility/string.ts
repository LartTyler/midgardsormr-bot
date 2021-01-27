export function plural(count: number, singular: string, plural?: string) {
	return count === 1 ? singular : plural ?? singular + 's';
}

export function getIndefiniteArticle(input: string) {
	switch (input.charAt(0)) {
		case 'a':
		case 'e':
		case 'i':
		case 'o':
		case 'u':
			return 'an';

		default:
			return 'a';
	}
}

export function joinWithConjunction(conjunction: string, items: string[]) {
	if (items.length === 0)
		return '';
	else if (items.length === 1)
		return items[0];
	else if (items.length === 2)
		return `${items[0]} ${conjunction} ${items[1]}`;

	return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

export function interpolate(input: string, values: {[key: string]: string}) {
	for (const key in Object.keys(values))
		input = input.replaceAll(`:${key}:`, values[key]);

	return input;
}
