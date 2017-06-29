// Test suite that exercise all line commands options
// Indirectly it also validates file generation (up to point)

const expect    = require("chai").expect;
const spawnSync = require('child_process').spawnSync
const fs        = require('fs')
const mkdirp    = require('mkdirp');

const testTempDir           = "test/tmp"
const testNonDirPath        = testTempDir + "/not-a-dir"
const testImpossibleDirPath = testNonDirPath + "/abc/def"

// copied from comment on:
// https://gist.github.com/liangzan/807712/8fb16263cb39e8472d17aea760b6b1492c465af2
var rmDir = function(dirPath) {
    try { var files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = dirPath + '/' + files[i];
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
    fs.rmdirSync(dirPath);
};


before(function(){
    console.log('Setting up test/tmp directory.')
    // let's create a temp folder where (almost) all test artifacts will be created
    // reset its content in this method to start the test suite in a know state

    // remove any old test artifacts
    rmDir(testTempDir)
    // make sure full path exist
    mkdirp.sync(testTempDir)

    // create an empty file
    // a test will try to create a sub-dir on it and will fail (as expected)
    fs.closeSync(fs.openSync(testNonDirPath, 'w'));
})



describe("Missing UML Argument", function() {
      it("call index.js without a URL argument", function() {
        missingUrl()
  });
});

describe("Fail if output path cannot be created", function() {
      it("call index.js with an impossible output path", function() {
        failMkdirp()
  });
});

describe("Generate UML File", function() {
      it("call index.js requesting to generate a plantuml file", function() {
        genUmlFile()
  });
});

describe("Generate PNG File", function() {
      it("call index.js requesting to generate a png file", function() {
        // this is a slower test. it generates a whole png file
        // on my MacBook Pro it took about 2.5 seconds
        // bumping this up to 10 seconds just in case
        // adjust if needed in the future
        this.timeout(10000);
        genPngFile()
  });
});

describe("Generate UML File in Deep Directory", function() {
      it("call index.js requesting a plantuml file, in a deep dir", function() {
        genUmlFileDeepDir()
  });
});


describe("Generate UML File with default name", function() {
      it("call index.js requesting a plantuml file, name it from the input file/URL", function() {
        genUmlFileDefaultName()
  });
});


var missingUrl = function () {
    // call index.js without a URL to read swagger specs from
    // the process should exit with a return code of 1 for this case
    var prc = spawnSync('node', ['index.js', '--uml'])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptErr = "Last argument must be the path or url of the swagger file to read."

    expect(prc.status, "exit code is 1").to.equal(1);
    expect(prc.stderr.toString('utf-8')).to.have.string(exptErr);
}

var failMkdirp = function () {
    // call index.js requesting a path that cannot be created (e.g. one of the dir is a file)
    // the process should exit with a return code of 2 for this case
    var prc = spawnSync('node', ['index.js', '-o', testImpossibleDirPath, '--uml', 'http://petstore.swagger.io/v2/swagger.yaml'])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptErr = "Failed to create output path:"

    expect(prc.status, "exit code is 2").to.equal(2);
    expect(prc.stderr.toString('utf-8')).to.have.string(exptErr);
}


var genUmlFile = function () {
    // call index.js requesting the output file to contain plantuml specification
    // instead of a png diagram

    // a file path or a URL to read swagger specifications from
    var specRef = 'test/my-app-swagger.yaml'
    // The path of the file where uml will be written to (derived from specRef here)
    var outFile = testTempDir + "/my-app-specs.plantuml"

    var prc = spawnSync('node', ['index.js', '--uml', '-o', outFile, specRef])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptOut = "Saved uml specification into file:"

    expect(prc.status, "exit code is 0").to.equal(0);
    expect(prc.stdout.toString('utf-8')).to.have.string(exptOut);

    var lines = fs.readFileSync(outFile).toString().split('\n');

    // if conversion occurred we should have at least: start, many lines, end
    expect(lines).to.have.lengthOf.above(2);
    expect(lines[0]).to.have.string("@startuml");
    // last element in "lines" is an empty line
    // this is why we are testing the 2nd last line, which is the last line with text
    expect(lines[lines.length-2]).to.have.string("@enduml");
}

var genPngFile = function () {
    // call index.js requesting the output file to be a png file with the uml diagram
    // This also validate that we can load specs from a URL, and in json format

    // a file path or a URL to read swagger specifications from
    var specRef = 'http://petstore.swagger.io/v2/swagger.json'
    // The path of the file where uml will be written to (derived from specRef here)
    var outFile = testTempDir + "/petstore.png"

    var prc = spawnSync('node', ['index.js', '--output', outFile, specRef])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptOut = "Saved png diagram into file:"

    expect(prc.status, "exit code is 0").to.equal(0);
    expect(prc.stdout.toString('utf-8')).to.have.string(exptOut);

    // let's check that the file start with the 8 bytes png header
    // See: https://en.wikipedia.org/wiki/Portable_Network_Graphics#File_header
    //
    // Future: we could also test the following bytes.
    // These should be first chunk.
    // Its type should be IHDR.
    // We could check that the image's width, height are non-zero

    var pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    var bytesToRead = 8
    var buffer = new Buffer(bytesToRead);

    var fd = fs.openSync(outFile, 'r')
    var bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, 0)

    expect(buffer, "PNG Header").to.deep.equal(pngHeader);
}


var genUmlFileDeepDir = function () {
    // call index.js requesting a plantuml specification in a non-existing deep directory

    // a file path or a URL to read swagger specifications from
    var specRef = 'test/my-app-swagger.yaml'
    // The path of the file where uml will be written to (derived from specRef here)
    var outFile = testTempDir + "/dir1/dir2/dir3/api-specs.plantuml"

    var prc = spawnSync('node', ['index.js', '-u', '-o', outFile, specRef])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptOut = "Saved uml specification into file:"

    expect(prc.status, "exit code is 0").to.equal(0);
    expect(prc.stdout.toString('utf-8')).to.have.string(exptOut);

    var lines = fs.readFileSync(outFile).toString().split('\n');

    // if conversion occurred we should have at least: start, many lines, end
    expect(lines).to.have.lengthOf.above(2);
    expect(lines[0]).to.have.string("@startuml");
    // last element in "lines" is an empty line
    // this is why we are testing the 2nd last line, which is the last line with text
    expect(lines[lines.length-2]).to.have.string("@enduml");
}

var genUmlFileDefaultName = function () {
    // call index.js requesting the output file to contain plantuml specification
    // The generated file will be named from the input file (or URL)

    // a file path or a URL to read swagger specifications from
    var specRef = 'test/my-app-swagger.yaml'
    // expected path where the uml file will be written to
    var outFile = "my-app-swagger.plantuml"

    var prc = spawnSync('node', ['index.js', '--uml', specRef])
//    console.log("prc.status = " + prc.status)
//    console.log("prc.signal = " + prc.signal)
//    console.log("prc.error = " + prc.error)
//    console.log("prc.stdout = " + prc.stdout)
//    console.log("prc.stderr = " + prc.stderr)

    exptOut = "Saved uml specification into file:"

    expect(prc.status, "exit code is 0").to.equal(0);
    expect(prc.stdout.toString('utf-8')).to.have.string(exptOut);

    var lines = fs.readFileSync(outFile).toString().split('\n');

    // if conversion occurred we should have at least: start, many lines, end
    expect(lines).to.have.lengthOf.above(2);
    expect(lines[0]).to.have.string("@startuml");
    // last element in "lines" is an empty line
    // this is why we are testing the 2nd last line, which is the last line with text
    expect(lines[lines.length-2]).to.have.string("@enduml");

    // cleanup, since in top dir, not in test tmp dir
    fs.unlinkSync('my-app-swagger.plantuml')
}
