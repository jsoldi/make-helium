import fs from 'fs';
import { utils } from "./utils.js";
const helium = fs.readFileSync(new URL('./content/helium-core.hls', import.meta.url)).toString();
export class Compiler {
    constructor() {
        this.sequence = (item) => `(SEQUENCE ${item})`;
        this.arguments = (items) => items.map(({ name, value }) => `${value}:${name}`).join(' ');
        this.structure = (items) => `{ ${this.arguments(items)} }`;
        this.function = (items, result) => `(${this.arguments(items)} -> ${result})`;
        this.isSequence = (type) => type.startsWith(this.sequence('X'));
        this.number = 'NUM';
        this.string = 'STRING';
        this.boolean = 'BOOL';
        this.default = 'STRING';
        this.makePascal = (name) => name[0].toUpperCase() + name.substring(1);
        this.getEscapedChar = (c) => {
            switch (c) {
                case '"':
                    return '\\"';
                case '\t':
                    return '\\t';
                case '\r':
                    return '\\r';
                case '\n':
                    return '\\n';
                case '\\':
                    return '\\\\';
                default:
                    return c;
            }
        };
        this.escapeString = (text) => {
            var result = '';
            for (var c of text) {
                var escaped = this.getEscapedChar(c);
                result += escaped;
            }
            return result;
        };
        this.compileFunctionData = (mode, name, data) => {
            var fullName = `${this.makePascal(mode)}.${this.makePascal(name)}`;
            if (data.parameters.length) {
                var type = this.function(data.parameters, data.result);
                var params = data.parameters.map(p => p.name);
                var args = params.map((p, i) => `_${i}: ${p}`);
                return `${fullName} :: ${type} = \\${params.join(' ')}.(@Eval.RunOrEval "${mode}" "${name}" #{ ${args.join(' ')} } (@.RetType :${fullName}))`;
            }
            else {
                var type = data.result;
                return `${fullName} :: ${type} = (@Eval.RunOrEval "${mode}" "${name}" #{} :${fullName})`;
            }
        };
        this.compileFunctionsData = (mode, data) => {
            return data.map(({ name, value }) => this.compileFunctionData(mode, name, value)).join('\n');
        };
        this.compileLambdaData = (data) => {
            return utils.entries(data).map(([mode, data]) => this.compileFunctionsData(mode, data)).join('\n');
        };
        this.compileType = (type) => {
            switch (type.name) {
                case 'String':
                    return this.string;
                case 'Number':
                    return this.number;
                case 'Boolean':
                    return this.boolean;
                case 'Array':
                    return this.sequence(this.compileType(type.item));
                case 'Object':
                    return this.structure(utils.pairMap(type.properties, t => this.compileType(t)));
                default:
                    return this.string;
            }
        };
        this.compileLambdaCode = (data, script) => {
            var code = helium;
            code = code.replace('<SCRIPT>', this.escapeString(script));
            code = code + this.compileLambdaData(data);
            return code;
        };
    }
}
//# sourceMappingURL=compiler.js.map