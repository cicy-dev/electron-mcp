const fs = require("fs");
const path = require("path");

const testsDir = path.join(__dirname, "tests");
const testFiles = fs.readdirSync(testsDir).filter((file) => file.endsWith(".test.js"));

testFiles.forEach((file) => {
  console.log(`npx jest ${file} --forceExit --testTimeout=30000`)
});

