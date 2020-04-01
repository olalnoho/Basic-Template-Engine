const fs = require('fs')
const {
   getWhiteSpace,
   makeObj,
   makeHTML,
   validateWhiteSpace,
   WhiteSpaceError,
   iterate,
   getIterator,
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
      const t_token = token.trim()
      if (!t_token) continue

      // Repeated logic in each and if, try to re-use in a shared place.

      if (t_token.startsWith('each ')) {
         const ws = getWhiteSpace(token)
         const s = token.trim().split(' ')[1]
         const iterator = opts[s] || getIterator(s)
         const exprs = []
         while (arr[++i].trim() !== 'end') {
            // exprs.push(arr[i].trim())
            exprs.push(insertValues(arr[i].trim(), opts))
         }
         const children = iterate(exprs, iterator, stack.last, ws)
         while (stack.last && stack.last.whitespace >= ws) stack.pop()
         if(!stack.last) throw new Error('Document cannot have two roots')
         stack.last.children = stack.last.children.concat(children)
         continue
      }

      if (t_token.startsWith('if ')) {
         const ws = getWhiteSpace(token)
         const condition = t_token.slice(2).trim()
         const exprs = []
         while (arr[++i].trim() !== 'endif') {
            exprs.push(insertValues(arr[i].trim(), opts, false))
         }
         if (evalCond(condition, opts)) {
            const children = buildIfBody(exprs, stack.last, ws)
            while (stack.last && stack.last.whitespace >= ws) stack.pop()
            if(!stack.last) throw new Error('Document cannot have two roots')
            stack.last.children = stack.last.children.concat(children)
         }
         continue
      }

      token = insertValues(token, opts)
      const el = makeObj(token)
      if (validator && !validator(el.whitespace)) {
         throw new WhiteSpaceError(tabLen)
      }
      const prev = stack.last

      // Where to place element

      if (el.whitespace > prev.whitespace) {
         if (!validator) {
            validator = validateWhiteSpace(el.whitespace)
            tabLen = el.whitespace
         }
         prev.children.push(el)
         stack.push(el)
      } else if (el.whitespace == prev.whitespace) {
         stack.pop()
         // Maybe concat here to support array objects from 'each' and 'if'
         stack.last.children.push(el)
         stack.push(el)
      } else {
         let parent = stack.pop()
         while (parent && parent.whitespace > el.whitespace) {
            parent = stack.pop()
         }
         if (!stack.last) {
            throw new Error('Document cannot have two roots')
         }
         stack.last.children.push(el)
         stack.push(el)
      }
   }
   IS_DEBUG && console.log(JSON.stringify(root, null, 2))
   fs.writeFileSync('./testfiles/index.html', makeHTML(root))
}

const file = fs.readFileSync('./testfiles/fixthis', 'utf8')
parse(file, {
   name: 'Alex',
   age12: 25,
   names: ['John', 'Mary']
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