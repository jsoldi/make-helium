import path from "path"
import fs from 'fs'
import { utils } from "./utils.js"

const helium = fs.readFileSync(new URL('./content/helium-core.hls', import.meta.url)).toString();

export class Compiler {
    sequence = (item : string) => `(SEQUENCE ${item})`
    arguments = (items: NamedPairs<string>) => items.map(( { name, value }) => `${value}:${name}`).join(' ')
    structure = (items: NamedPairs<string>) => `{ ${this.arguments(items)} }`
	function = (items: NamedPairs<string>, result: string) => `(${this.arguments(items)} -> ${result})`
	isSequence = (type: string) => type.startsWith(this.sequence('X'))
	number = 'NUM'
	string = 'STRING'
	boolean = 'BOOL'
	default ='STRING'

    private makePascal = (name: string) => name[0].toUpperCase() + name.substring(1)

    private getEscapedChar = (c: string) => {
        switch(c) {
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
    }
    
    private escapeString = (text: string) => {
        var result = '';
    
        for (var c of text) {
            var escaped = this.getEscapedChar(c);
            result += escaped;
        }
    
        return result;
    }

    private compileFunctionData = (mode: RunMode, name: string, data: FunctionData<string>) => {
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
    }
    
    private compileFunctionsData = (mode: RunMode, data: FunctionsData<string>) => {
        return data.map(({ name, value }) => this.compileFunctionData(mode, name, value)).join('\n');
    }
    
    private compileLambdaData = (data: LambdaData) => {
        return utils.entries(data).map(([mode, data]) => this.compileFunctionsData(mode, data)).join('\n');
    }
    
    compileType = (type: SimpleType) : string => {
        switch(type.name) {
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
    }

    compileLambdaCode = (data: LambdaData, script: string) => {
        var code = helium;
        code = code.replace('<SCRIPT>', this.escapeString(script))
        code = code + this.compileLambdaData(data);
        return code;
    }
}
