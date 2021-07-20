import ts from 'typescript'
import { utils } from './utils.js';

export class SimpleArray implements SimpleArrayType {
    readonly name = 'Array'
    readonly item: SimpleType

	constructor(item: SimpleType) {
		this.item = item;
	}
}

export class SimpleObject implements SimpleObjectType {
    readonly name = 'Object'
    readonly properties: NamedPairs<SimpleType>

	constructor(properties: NamedPairs<SimpleType>) {
		this.properties = properties;
	}
}

export class Typing {
    private readonly tc: ts.TypeChecker

    constructor(typeChecker: ts.TypeChecker) {
        this.tc = typeChecker;
    }

    getNameNodeText = (name: ts.Node) => {
        if (ts.isIdentifier(name) || ts.isStringLiteral(name))
            return name.text;
        else
            throw new Error('Not supported property name.')	
    }
    
    getProperties = (type: ts.Type) : NamedPairs<ts.Type> => {
        return type.getProperties().filter(p => p.valueDeclaration || p.declarations?.length).map(prop => ({
            name: prop.name,
            value: this.tc.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration || prop.declarations![0])
        }));
    }
    
    getFunction = (declaration: ts.FunctionLikeDeclaration) : FunctionData<ts.Type> => {
        var signature = this.tc.getSignatureFromDeclaration(declaration)!;
        var result = this.tc.getReturnTypeOfSignature(signature)!;
    
        var parameters = declaration.parameters.map((param) => {
            var name = this.getNameNodeText(param.name);
            var value = this.tc.getTypeAtLocation(param);
            return { name, value };
        });
    
        return { parameters, result };
    }

    isTypeReference = (type: ts.Type): type is ts.TypeReference => {
        return (type.flags & ts.TypeFlags.Object) !== 0 &&
            ((<ts.ObjectType>type).objectFlags & ts.ObjectFlags.Reference) !== 0;
    }
    
    isFunctionLikeDeclaration = (node: ts.Declaration) : node is ts.FunctionLikeDeclaration => {
        return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node);
    }

    simplifyType = (type: ts.Type | undefined) : SimpleType => {
        if (type) {
            if (type.flags & ts.TypeFlags.String) 
                return { name: 'String' }
    
            if (type.flags & ts.TypeFlags.Number)
                return { name: 'Number' }
    
            if (type.flags & ts.TypeFlags.Boolean)
                return { name: 'Boolean' }
    
            // Type symbol may actually be undefined
            if (type.symbol?.name === 'Array' && this.isTypeReference(type) && type.typeArguments && type.typeArguments.length === 1) {
                var elementType = this.simplifyType(type.typeArguments[0]);
                return new SimpleArray(elementType);
            }
    
            if (type.flags & ts.TypeFlags.Object) {
                var properties = this.getProperties(type);
                var members = utils.pairMap(properties, t => this.simplifyType(t));
                return new SimpleObject(members);
            }
        }
    
        return { name: 'Unknown' }
    }

    simplifyFunction = (funcType: ts.Type) : FunctionData<SimpleType> => {
        var declaration = funcType.symbol?.valueDeclaration; // Type symbol may actually be undefined
    
        if (declaration && this.isFunctionLikeDeclaration(declaration)) {
            var fun = this.getFunction(declaration);
            var parameters = utils.pairMap(fun.parameters, t => this.simplifyType(t)); 
            var result = this.simplifyType(fun.result);
            return { parameters, result }
        }
        else
            throw new Error('Only functions are allowed. To create a value, use a function with no arguments.');
    }
}
