import fs from 'fs'
import util from 'util'
import { getDateISO } from './utils.js'

export class CompletionLogger {
    constructor() {
        this.logFile = fs.createWriteStream(`./data/completion${getDateISO()}.tsv`, {flags : 'w'})
        this.logFile.write(util.format("prompt\tcompletion") + '\n');
    }

    writeCompletion(prompt, completion) {
        this.logFile.write(util.format(prompt + '\t' + completion) + '\n');
    }
}