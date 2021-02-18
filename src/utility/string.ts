import {oneLine, stripIndent} from 'common-tags';

export function plural(count: number, singular: string, plural?: string) {
	return count === 1 ? singular : plural ?? singular + 's';
}

export function getIndefiniteArticle(input: string) {
	// Special cases, because English is a weird language.
	if (input === 'user')
		return 'a';

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

export function interpolate(input: string, values: { [key: string]: string }) {
	for (const key in values)
		input = input.replaceAll(`:${key}:`, values[key]);

	return input;
}

export function ucfirst(input: string): string {
	return input.charAt(0).toUpperCase() + input.substring(1);
}

export interface Section {
	title: string;
	contents: string;
}

export function sections(sections: Section[]): string {
	return sections.map(item => section(item.title, item.contents)).join('\n\n');
}

export function section(title: string, contents: string): string {
	contents = stripIndent(contents).split(/\n{2,}/).map(item => item.replaceAll('\n', ' ')).join('\n\n');

	return `**${title}**\n${contents}`;
}
