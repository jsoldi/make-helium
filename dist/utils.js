import path from 'path';
import fs from 'fs';
export const utils = {
    entries: function (obj) {
        return Object.entries(obj);
    },
    pairMap: function (pairs, map) {
        return pairs.map(({ name, value }, index) => ({ name, value: map(value, name, index) }));
    },
    createDirectory: function (filePath) {
        var dirname = path.dirname(filePath);
        if (!fs.existsSync(dirname)) {
            utils.createDirectory(dirname);
            fs.mkdirSync(dirname);
        }
    }
};
//# sourceMappingURL=utils.js.map