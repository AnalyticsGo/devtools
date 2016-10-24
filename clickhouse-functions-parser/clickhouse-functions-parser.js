var fs = require('fs')
var cheerio = require('cheerio')
var keywordsList = new Set()
var functionsList = new Set()

var ch_parser = function(html) {
  var $ = cheerio.load(html)
  var contents = $('#contents')

  var keywordSection = contents.find('a:contains("Query language")')
  var currentTag = keywordSection.first().next()
  do {
    var textTag = currentTag.text()
    if (textTag.length > 0) {
      var keywordElement = null
      if (/[A-Z]{2,}/.test(textTag)) {
        // pattern XX XX yyyy
        keywordElement = textTag.match(/[A-Z]{2,}/g)
      }
      if (keywordElement != null) {
        keywordElement.forEach(function(name) {
          keywordsList.add(name.trim().toLowerCase())
        })
      }
    }
    currentTag = currentTag.next()
  } while (currentTag.text() !== "Table engines")

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
            functionsList.add(name)
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
}

if (process.argv.length < 4) {
  console.log('Usage: node clickhouse-functions-parser.js input_ch_html output_ch_js')
  process.exit(1)
}

fs.readFile(process.argv[2], 'utf8', function(err, data) {
  if (err) throw err
  ch_parser(data)
  var file = fs.createWriteStream(process.argv[3])
  file.write("var chKeywordsList = [ \n")
  file.write('\t"' + Array.from(keywordsList).join('",\n\t"') + '"\n')
  file.write("]\n")
  file.write("var chFunctionsList = [ \n")
  file.write('\t"' + Array.from(functionsList).join('",\n\t"') + '"\n')
  file.write("]")
  file.end()
})