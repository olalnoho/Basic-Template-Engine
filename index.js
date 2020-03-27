const fs = require('fs')
const {
   getWhiteSpace,
   makeObj,
   makeHTML,
   validateWhiteSpace,
   WhiteSpaceError
} = require('./utils')

const IS_DEBUG = process.argv[2] == 'd';
const parse = (str, opts) => {
   opts = opts || {}
   const arr = str.split(/\r?\n/g);
   const root = makeObj(arr.shift())
   const stack = [root]
   let validator;
   let tabLen;
   for (let token of arr) {
      if (!token.trim()) continue
      token = token.replace(/\$\{(.+)\}/, (val, g) => {
         if(!opts[g]) throw new Error(`Could not find value for ${g}`)
         return opts[g]
      })
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
         while (parent && parent.whitespace >= el.whitespace) {
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

const file = fs.readFileSync('./test.pug', 'utf8')
parse(file, {
   paragraph: 'This is a long paragraph',
   heading: 'Title for box'
})