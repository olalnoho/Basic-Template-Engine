const fs = require('fs')
const {
   getWhiteSpace,
   makeObj,
   makeHTML,
   validateWhiteSpace,
   WhiteSpaceError,
   iterate,
   evalCond,
   buildIfBody,
   insertValues
} = require('./utils')

const IS_DEBUG = process.argv[2] == 'd';
const parse = (str, opts) => {
   opts = opts || {}
   const arr = str.split(/\r?\n/g);
   const root = makeObj(arr.shift())
   const stack = [root]
   let validator;
   let tabLen;
   for (let i = 0; i < arr.length; i++) {
      let token = arr[i]
      let t_token = token.trim()
      if (!t_token) continue

      if (t_token.startsWith('each ')) {
         const iterator = opts[token.trim().split(' ')[1]]
         const exprs = []
         while (arr[++i].trim() !== 'end') {
            // exprs.push(arr[i].trim())
            exprs.push(insertValues(arr[i].trim(), opts))
         }
         iterate(exprs, iterator, stack.last, getWhiteSpace(token))
         continue
      }

      if (t_token.startsWith('if ')) {
         const condition = t_token.slice(2).trim()
         const exprs = []
         while (arr[++i].trim() !== 'endif') {
            exprs.push(insertValues(arr[i].trim(), opts))
         }
         if (evalCond(condition, opts)) {
            buildIfBody(exprs, stack.last, getWhiteSpace(token))
         }
         continue
      }

      token = insertValues(token, opts)
      const el = makeObj(token)
      if (validator && !validator(el.whitespace)) {
         throw new WhiteSpaceError(tabLen)
      }
      const prev = stack.last
      if (el.whitespace > prev.whitespace) {
         if (!validator) {
            validator = validateWhiteSpace(el.whitespace)
            tabLen = el.whitespace
         }
         prev.children.push(el)
         stack.push(el)
      } else if (el.whitespace == prev.whitespace) {
         stack.pop()
         stack.last.children.push(el)
         stack.push(el)
      } else {
         let parent = stack.pop()
         while (parent && parent.whitespace > el.whitespace) {
            parent = stack.pop()
         }
         if (!parent) {
            throw new Error('Document cannot have two roots')
         }
         parent.children.push(el)
         stack.push(el)
      }
   }
   IS_DEBUG && console.log(JSON.stringify(root, null, 2))
   fs.writeFileSync('./testfiles/index.html', makeHTML(root))
}

const file = fs.readFileSync('./testfiles/testfile', 'utf8')
parse(file, {
   name: 'Alex',
   age12: 25,
   arr: [1,2,3,4,5]
})
// parse(file, {
//    paragraph: 'This is a long paragraph',
//    heading: 'Title for box',
//    values: [
//       'Mandy',
//       'Jasmine',
//       'James',
//       'Steve'
//    ]
// })