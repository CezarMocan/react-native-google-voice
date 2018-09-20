import stemmer from 'stemmer'
import levenshtein from 'levenshtein-edit-distance'
import metaphone from 'metaphone'

export const textToArray = (text) => {
  return text.split(/ +/).filter(w => w != "").map(w => sanitize(w))
}

export const sanitize = (w) => {
  return w.toLowerCase().replace(/\W/g, '')
}

export const similarityScore = (word1, word2) => {
  // console.log('Words: ', word1, word2)
  if (!word1 || !word2) return 0

  const sanitized1 = sanitize(word1)
  const sanitized2 = sanitize(word2)

  // console.log('Sanitized: ', sanitized1, sanitized2)

  const stem1 = sanitized1//stemmer(sanitized1)
  const stem2 = sanitized2//stemmer(sanitized2)

  // console.log('Stemmed: ', stem1, stem2)

  const m1 = metaphone(stem1)
  const m2 = metaphone(stem2)

  // console.log('Metaphone: ', m1, m2)

  const dist = levenshtein(m1, m2)
  const mLen = Math.max(m1.length, m2.length)
  const score = (mLen - dist) / mLen

  // console.log('Distance is: ', dist, ' score is: ', score * 100)

  return score
}