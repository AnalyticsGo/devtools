var fs = require('fs')
var cheerio = require('cheerio')

var ch_parser = function(html) {
  var functionsList = new Set()
  var $ = cheerio.load(html)
  var contents = $('#contents')
  var functionSection = contents.find('a:contains("Functions")')
  var currentTag = functionSection.eq(1).next()

  do {
    var textTag = currentTag.text()
    if (textTag.length > 0) {
      var functionElement = null
      if (/(to|reinterpret|dict|emptyArray)[A-Z]\w+/.test(textTag)) {
        // pattern toXXXX or reinterpretXXXX or dictXXXX or emptyArrayXXXX
        functionElement = textTag.match(/(to|reinterpret|dict|emptyArray)[A-Z]\w+/g)
      } else if (/\w+\(/.test(textTag)) {
        // pattern XXXX(...)
        functionElement = textTag.match(/\w+/)
      } else if (/\w+\,/.test(textTag)) {
        // pattern XXXX, xxxx operator
        functionElement = textTag.match(/\w+/)
      } else if (!/[a-z]\w+\s/.test(textTag)) {
        // pattern XXXX
        functionElement = textTag.match(/^[a-z]\w+/)
      }
      if (functionElement != null) {
        functionElement.forEach(function(name) {
          functionsList.add(name)
        })
      }
    }
    currentTag = currentTag.next()
  } while (currentTag.text() !== "Aggregate functions")

  // Special cases: notIn, globalIn, globalNotIn, lambda
  functionsList.add('notIn')
  functionsList.add('globalIn')
  functionsList.add('globalNotIn')
  functionsList.add('lambda')

  var aggregateFunctionList = new Set()
  do {
    var textTag = currentTag.text()
    if (textTag.length > 0) {
      var functionElement = null
      if (/\w+\(/.test(textTag)) {
        // pattern XXXX(...)
        functionElement = textTag.match(/\w+/)
        if (functionElement != null) {
          functionElement.forEach(function(name) {
            aggregateFunctionList.add(name)
          })
        }
      }
    }
    currentTag = currentTag.next()
  } while (currentTag.text() !== "Aggregate function combinators")

  do {
    var textTag = currentTag.text()
    if (textTag.length > 0) {
      var functionElement = null
      if (/(\-)+\w+/.test(textTag)) {
        // pattern XXXX(...)
        functionElement = textTag.match(/\w+/)
        if (functionElement != null) {
          functionElement.forEach(function(name) {
            aggregateFunctionList.forEach(function(aF) {
              functionsList.add(aF+name)
            })
          })
        }
      }
    }
    currentTag = currentTag.next()
  } while (currentTag.text() !== "Dictionaries")

  return functionsList
}

if (process.argv.length < 4) {
  console.log('Usage: node clickhouse-functions-parser.js input_html_content output_js_functions')
  process.exit(1)
}

fs.readFile(process.argv[2], 'utf8', function(err, data) {
  if (err) throw err
  var functionsList = ch_parser(data)
  var file = fs.createWriteStream(process.argv[3])
  file.write("var clickhouseFunctionsList = [ \n")
  file.write('\t' + Array.from(functionsList).join(',\n\t') + '\n')
  file.write("]")
  file.end()
});