interface NamedPair<T> {
	name: string
	value: T
}

type NamedPairs<T> = NamedPair<T>[]

type FunctionsData<T> = NamedPairs<FunctionData<T>>

interface FunctionData<T> { parameters: NamedPairs<T>, result: T }

type RunMode = "eval" | "run";

type LambdaData = { [mode in RunMode]: FunctionsData<string> };
type SimpleTypeName = 'String' | 'Boolean' | 'Number' | 'Array' | 'Object' | 'Unknown'
interface SimpleStringType { name: 'String' }
interface SimpleNumberType { name: 'Number' }
interface SimpleBooleanType { name: 'Boolean' }
interface SimpleUnknownType { name: 'Unknown' }

interface SimpleArrayType {
	name: 'Array'
	item: SimpleType
}

interface SimpleObjectType {
	name: 'Object'
	properties: NamedPairs<SimpleType>
}

type SimpleType = SimpleStringType | SimpleNumberType | SimpleBooleanType | SimpleArrayType | SimpleObjectType | SimpleUnknownType
