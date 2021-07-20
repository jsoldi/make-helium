import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { Command } from 'commander'

const program = new Command();
const pkg = JSON.parse(fs.readFileSync('./package.json').toString())

const color = {
    white: '\x1b[37m%s\x1b[0m',
    green: '\x1b[32m%s\x1b[0m',
    yellow: '\x1b[33m%s\x1b[0m',
    red: '\x1b[31m%s\x1b[0m',
    cyan: '\x1b[36m%s\x1b[0m'
}

const opts = program
    .option('--clean', 'build the project', 'helium.hls')
    .option('--build', 'clear the dist folder')
    .showHelpAfterError()
    .parse(process.argv)
    .opts()

function copyDirectory(source, destination) {
    fs.mkdirSync(destination, { recursive: true })

    for (var entry of fs.readdirSync(source, { withFileTypes: true })) {
        let sourcePath = path.join(source, entry.name)
        let destinationPath = path.join(destination, entry.name)

        if (entry.isDirectory())
            copyDirectory(sourcePath, destinationPath)
        else
            fs.copyFileSync(sourcePath, destinationPath)
    }
}

function deleteDirectory(folder) {
    fs.rmdirSync(folder, { recursive: true, force: true });
}

function runCommand(name) {
    exec(name, (error, stdout, stderr) => {
        if (error)       
            console.log(color.red, error.message)

        if (stdout)
            console.log(color.cyan, stdout)

        if (stderr)
            console.error(color.red)
    })
}

function build() {
    if (opts.clean) {
        deleteDirectory('./dist')
        fs.mkdirSync('./dist')
    }

    if (opts.build) {
        const safePackage = {
            name: pkg.name,
            version: pkg.version
        }

        copyDirectory('./src/content', './dist/content')
        fs.writeFileSync('./dist/pkg.json', JSON.stringify(safePackage, null, '  '))
        runCommand('tsc')
    }

    console.log(color.green, 'Done!')
}

build();
