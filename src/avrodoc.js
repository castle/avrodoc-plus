/**
 * Main avrodoc(-plus) module
 */

const content = require('./static_content');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('avrodoc:avrodoc');
/**
 *
 * @param {Array<string>} inputfiles an array with resolved filenames to be read and parsed and eventually added to the avrodoc
 * @param {string} outputfile the html file that should be written
 */
function createAvroDoc(extra_less_files, inputfiles, outputfile, subSchemaFiles){
    let subSchemaRepo = {}

    subSchemaFiles.map(function(file) {
        let json = readJSON(file);
        subSchemaRepo[json.namespace + '.' + json.name] = json;
    });

    debug(`Creating ${outputfile} from `, inputfiles);
    let schemata = inputfiles.map(function (filename) {
        return {
            json: readNestedJSON(filename, subSchemaRepo),
            filename: filename
        };
    });
    content.topLevelHTML(extra_less_files, {
        inline: true,
        schemata: schemata
    }, function (err, html) {
        if (err) {
            throw err;
        }
        writeAvroDoc(outputfile, html);
    });
}

// I hate Javascript
function isObject (value) {
    return value && typeof value === 'object' && value.constructor === Object;
}

const avroTypes = ['string', 'boolean', 'bytes', 'long', 'null', 'int', 'float', 'double'];
function resolveSubSchema(type, repo) {
    if (repo[type]) {
        replaceSubSchema(repo[type], repo);
        return repo[type];
    } else if (isObject(type)) {
        if(type.items) {
            type.items = resolveSubSchema(type.items, repo);
        }
        return type;
    }
    return type;
}

function replaceType(type, repo) {
    if (Array.isArray(type)) {
        return type.map(function(type) {
            return resolveSubSchema(type, repo);
        });
    } else {
        return resolveSubSchema(type, repo);
    }
}

function replaceSubSchema(json, repo) {
    if (!json.fields) {
        return;
    }
    json.fields.map((field, idx) => {
        json.fields[idx].type = replaceType(field.type, repo);

        return json.fields[idx];
    });
}

function readNestedJSON(filename, repo) {
    let json = readJSON(filename);

    replaceSubSchema(json, repo);

    return json;
}

// private stuf

function writeAvroDoc(output, html){
    if (output.indexOf('/') > -1) {
        let outFolder = path.resolve(process.cwd(), output.substring(0, output.lastIndexOf('/')));
        if(!fs.existsSync(outFolder)){
            fs.mkdirSync(outFolder);
        }
    }
    fs.writeFile(output, html, function (err) {
        if (err) {
            throw err;
        } else {
            console.log('Avrodoc saved to ' + output);
        }
    });
}


/**
 * Reads in the given file and parses as json
 * @param {string} filename to be read
 * @returns {object} with parsed AVRO
 */
function readJSON(filename) {
    let json, parsed;
    debug('Parsing ', filename);
    json = fs.readFileSync(path.resolve(process.cwd(), filename), 'utf-8');
    try {
        parsed = JSON.parse(json);
    } catch (e) {
        sys.error('Not a valid json file: ' + filename);
        process.exit(1);
    }
    return parsed;
}

exports.createAvroDoc = createAvroDoc;