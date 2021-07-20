interface HeliumSelector {
    [prop: string]: Record<string, unknown>
}

interface Global {
    setInputValue: (e: HTMLInputElement, a: string) => void
    getElementPath: (e: Node, p?: Node) => string
    getElementByPath: (_p: string, p?: Node) => Node | null
    getElementsBySelector: (s: HeliumSelector, p?: Node) => Node[]
    getSelector: (name: string) => HeliumSelector
    log: (msg: string) => void    
    // TODO: Actual return types:
    webRequest: (url: string, method: string, headers: unknown, body: unknown, timeout: number, returnBytes: boolean) => { headers: any; response: any } 
    recur: boolean
}

// @ts-ignore
declare const global: Global
declare const element: HTMLElement
