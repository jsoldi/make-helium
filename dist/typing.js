import ts from 'typescript';
import { utils } from './utils.js';
export class SimpleArray {
    constructor(item) {
        this.name = 'Array';
        this.item = item;
    }
}
export class SimpleObject {
    constructor(properties) {
        this.name = 'Object';
        this.properties = properties;
    }
}
export class Typing {
    constructor(typeChecker) {
        this.getNameNodeText = (name) => {
            if (ts.isIdentifier(name) || ts.isStringLiteral(name))
                return name.text;
            else
                throw new Error('Not supported property name.');
        };
        this.getProperties = (type) => {
            return type.getProperties().filter(p => p.valueDeclaration || p.declarations?.length).map(prop => ({
                name: prop.name,
                value: this.tc.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration || prop.declarations[0])
            }));
        };
        this.getFunction = (declaration) => {
            var signature = this.tc.getSignatureFromDeclaration(declaration);
            var result = this.tc.getReturnTypeOfSignature(signature);
            var parameters = declaration.parameters.map((param) => {
                var name = this.getNameNodeText(param.name);
                var value = this.tc.getTypeAtLocation(param);
                return { name, value };
            });
            return { parameters, result };
        };
        this.isTypeReference = (type) => {
            return (type.flags & ts.TypeFlags.Object) !== 0 &&
                (type.objectFlags & ts.ObjectFlags.Reference) !== 0;
        };
        this.isFunctionLikeDeclaration = (node) => {
            return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node);
        };
        this.simplifyType = (type) => {
            if (type) {
                if (type.flags & ts.TypeFlags.String)
                    return { name: 'String' };
                if (type.flags & ts.TypeFlags.Number)
                    return { name: 'Number' };
                if (type.flags & ts.TypeFlags.Boolean)
                    return { name: 'Boolean' };
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
            return { name: 'Unknown' };
        };
        this.simplifyFunction = (funcType) => {
            var declaration = funcType.symbol?.valueDeclaration; // Type symbol may actually be undefined
            if (declaration && this.isFunctionLikeDeclaration(declaration)) {
                var fun = this.getFunction(declaration);
                var parameters = utils.pairMap(fun.parameters, t => this.simplifyType(t));
                var result = this.simplifyType(fun.result);
                return { parameters, result };
            }
            else
                throw new Error('Only functions are allowed. To create a value, use a function with no arguments.');
        };
        this.tc = typeChecker;
    }
}
//# sourceMappingURL=typing.js.map