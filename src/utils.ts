import path from 'path'
import fs from 'fs'

type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][]

export const utils = {
	entries: function<T>(obj: T) {
		return Object.entries(obj) as Entries<T>;
	},
	pairMap: function<S, T>(pairs: NamedPairs<S>, map: (value: S, name?: string, index?: number) => T) : NamedPairs<T> {
		return pairs.map(({ name, value }, index) => ({ name, value: map(value, name, index) }));
	},
	createDirectory: function(filePath: string) {
		var dirname = path.dirname(filePath);

		if (!fs.existsSync(dirname)) {
			utils.createDirectory(dirname);
			fs.mkdirSync(dirname);
		}
	}	
}
