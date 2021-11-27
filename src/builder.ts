import path from 'path'
import fs from 'fs'
import ts from 'typescript'
import { Compiler } from './compiler.js'
import { Typing, SimpleArray } from './typing.js'
import { utils } from './utils.js'
import UglifyJS from 'uglify-js'

export class DiagnosticsError extends Error {
    diagnostics: ts.Diagnostic[]

    constructor(diagnostics: ts.Diagnostic[]) {
        super(DiagnosticsError.formatDiagnostics(diagnostics))
        this.name = 'DiagnosticError'
        this.diagnostics = diagnostics
    }

    private static readonly formatHost : ts.FormatDiagnosticsHost = {
        getCanonicalFileName: (path) => path,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => ts.sys.newLine,
    }

    private static formatDiagnostics = (diagnostics: ts.Diagnostic[]) => ts.formatDiagnostics(diagnostics, DiagnosticsError.formatHost) || 'Unknown error'
}

export class Builder {
    readonly program: ts.Program
    readonly typeChecker: ts.TypeChecker
    readonly typing: Typing
    readonly compiler: Compiler

    constructor(private readonly inputDir: string) {
        this.program = Builder.createProgram(path.resolve(inputDir));
        this.typeChecker = this.program.getTypeChecker();
        this.typing = new Typing(this.typeChecker);
        this.compiler = new Compiler();
    }

    private static createProgram = (absInputDir: string) : ts.Program => {
        const configFile = ts.findConfigFile(absInputDir, ts.sys.fileExists, 'tsconfig.json')
    
        if (!configFile) 
            throw new Error('tsconfig.json not found.')
        
        const { config, error } = ts.readConfigFile(configFile, ts.sys.readFile)

        if (error)
            throw new DiagnosticsError([error]);

        config.compilerOptions = Object.assign({}, config.compilerOptions, { outFile: "./out.js" /* Won't be used */ });
        const { options, fileNames, errors } = ts.parseJsonConfigFileContent(config, ts.sys, absInputDir)

        if (errors.length)
            throw new DiagnosticsError(errors);

        return ts.createProgram({ options, rootNames: fileNames, configFileParsingDiagnostics: errors })
    }

    private getFunctionsData = (sectionType: ts.Type | undefined, mapResult: (type: SimpleType) => SimpleType) : FunctionsData<string> => {
        if (sectionType) {
            var props = this.typing.getProperties(sectionType);
    
            return utils.pairMap(props, funType => {
                var fun = this.typing.simplifyFunction(funType);
    
                return {
                    parameters: utils.pairMap(fun.parameters, t => this.compiler.compileType(t)),
                    result: this.compiler.compileType(mapResult(fun.result))
                }
            })
        }
        else
            return [];
    }
    
    private getLambdaData = () : LambdaData => {
        var children = this.program.getSourceFiles().flatMap(s => s.getChildren()).flatMap(c => c.getChildren())
    
        var helium = children.find(function(child) { 
            return ts.isVariableStatement(child) 
                && child.declarationList.declarations.length 
                && ts.isIdentifier(child.declarationList.declarations[0].name)
                && child.declarationList.declarations[0].name.text === "helium";
        });
    
        if (!(helium && ts.isVariableStatement(helium) && helium.declarationList.declarations.length))
            throw new Error('A top level variable called helium must be declared.');
    
        var tc = this.program.getTypeChecker();
        var type = tc.getTypeAtLocation(helium.declarationList.declarations[0]);
        var properties = this.typing.getProperties(type);
        var mapResult = (type: SimpleType) => type.name !== 'Array' ? new SimpleArray(type) : type;
    
        return {
            eval: this.getFunctionsData(properties.find(p => p.name === 'eval')?.value, mapResult),
            run: this.getFunctionsData(properties.find(p => p.name === 'run')?.value, mapResult)
        };
    }    
       
    getScriptCode = () : string => {
        var script = '';
        var preDiagnostics = ts.getPreEmitDiagnostics(this.program);
        var { diagnostics, emitSkipped } = this.program.emit(undefined, function(_outFile, json) { script = json; });
    
        if (emitSkipped) {
            var allDiags = preDiagnostics.concat(diagnostics);
            throw allDiags.length ? new DiagnosticsError(allDiags) : new Error('Could not emit program due to an unknown error.')
        }
    
        return script;
    }

    getLambdaCode = (script: string) => {
        var data = this.getLambdaData();
        return this.compiler.compileLambdaCode(data, script);
    }

    minifyCode = (code: string) => {
        let min = UglifyJS.minify(code);

        if (min.error)
            throw min.error;

        return min.code;
    }

    static searchFilesRecursively(dir: string, ext: string): string[] {
        let files = fs.readdirSync(dir);
        let result: string[] = [];

        for (let file of files) {
            let filePath = path.join(dir, file);
            let stat = fs.statSync(filePath);

            if (stat.isDirectory())
                result = result.concat(Builder.searchFilesRecursively(filePath, ext));
            else if (path.extname(filePath) === ext)
                result.push(filePath);
        }

        return result;
    }

    readHeliumCode = (excludedFile: string) => {
        let files = Builder.searchFilesRecursively(this.inputDir, '.hls');
        return files.filter(p => p !== excludedFile).map(f => fs.readFileSync(f, 'utf8')).join('\n');
    }

    build = (outputLambdaPath: string, minify: boolean) => {
        let scriptCode = this.getScriptCode();
        let minScriptCode = minify ? this.minifyCode(scriptCode) : scriptCode;
        let lambdaCode = this.getLambdaCode(minScriptCode);
        let outPath = path.resolve(outputLambdaPath);
        let userLambdaCode = this.readHeliumCode(outPath);
        utils.createDirectory(outPath);
        fs.writeFileSync(outPath, lambdaCode + '\n-----------------------------------\n' + userLambdaCode);
    }
}
