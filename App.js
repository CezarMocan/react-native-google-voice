/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import styled from 'styled-components'
import GoogleVoice from './GoogleVoice'
import { textToRead2, textToRead3, textToRead4, textToRead5, textToRead6, textToRead7, textToRead13, textToRead14, textToRead12, textToRead11, textToRead10, textToRead9, textToRead8 } from './Text'
import { Part1, Part2, Part3, Part4, Part5 } from './GivingTree.js'
import { similarityScore, textToArray } from './utils'
import clamp from 'lodash.clamp'

// const TEXTS = [textToRead14, textToRead13, textToRead12, textToRead11, textToRead10, textToRead9, textToRead8, textToRead2, textToRead3, textToRead4, textToRead5, textToRead6, textToRead7]
const TEXTS = [Part1, Part2, Part3, Part4, Part5]

const TEST_API_KEY = 'AIzaSyD-o08CQL91vezbKziBXYn9BuC7tL9wrMk'

const StyledContainer = styled(View)`
  height: 100%;
  width: 100%;
  padding: 30px;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
`

const BottomView = styled(View)`
  position: absolute;
  bottom: 25px;
  left: 0;
  display: flex;
  flex: 1;
  flex-direction: row;
`

const TextContainer = styled(View)`
  display: flex;
  flex-direction: row;
  flex: 1;
  max-width: 100%;
  flex-wrap: wrap;
  max-height: 300px;
`

const StyledTextButton = styled(Text)`
  color: black;
  font-size: 20px;
  margin: 0 10px;
`

const StyledTextNext = styled(Text)`
  position: absolute;
  right: 0;
  top: 300px;
  color: white;  
  font-size: 30px;
  padding: 10px;
  background-color: black;
`

const StyledText = styled(Text)`
  color: black;
  font-size: 20px;
`

const ReadText = styled(Text)`
  color: ${props => props.color};
  font-size: 36px;
  line-height: 44px;
`

export default class App extends Component<Props> {
  constructor(props) {
    super(props)
    GoogleVoice.onSpeechStart = this.onSpeechStart.bind(this)
    GoogleVoice.onSpeechEnd = this.onSpeechEnd.bind(this)
    GoogleVoice.onSpeechResults = this.onSpeechResults.bind(this)
    GoogleVoice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this)

    this.onPressStart = this.onPressStart.bind(this)
    this.onPressStop = this.onPressStop.bind(this)
    this.onPressClear = this.onPressClear.bind(this)
    this.onPressNext = this.onPressNext.bind(this)

    this.state = {
      totalText: '',
      text: '',
      completionIndex: -1,
      unstableCompletionIndex: -1,
      listening: false,
      currTextToRead: 0
    }

    this._restartInterval = null

    this.stableTextArray = []
    this.unstableTextArray = []
  }

  onSpeechStart(e) {
    // console.log('onSpeechStart', e)
    this.setState({
      listening: true
    })
  }

  onSpeechEnd(e) {
    // console.log('onSpeechEnd', e)
    this.setState({
      listening: false
    })
  }

  onSpeechResults(e) {
    this.setState({
      totalText: this.state.totalText + this.state.text,
      completionIndex: this.state.unstableCompletionIndex,
      text: ''
    })
    this.stableTextArray = []
    this.unstableTextArray = []
    // console.log('onSpeechResults', e)
  }

  processSpeech(type, completionIndex, lastWord, chillFactor = 3) {
    const textToRead = TEXTS[this.state.currTextToRead]

    for (let index = completionIndex + 1; index <= Math.min(completionIndex + chillFactor, textToRead.length); index++) {
      // Prevent from matching short words too far ahead.
      if (index - completionIndex > 4 && lastWord.length < 4) continue

      const score = similarityScore(lastWord, textToRead[index])
      if (score >= 0.7) {
        // console.log(type, ' ****** Matched: ', lastWord, textToRead[index])
        return index
      } else if (score >= 0.5) {
        // console.log(type, ' ****** Not mached: ', lastWord, textToRead[index], 'score: ', score)
      }
    }

    return completionIndex
  }

  advanceStableIndex(newStableTextArray, fullText) {
    const oldStableTextArray = this.stableTextArray

    let { unstableCompletionIndex, completionIndex, currTextToRead } = this.state
    let newCompletionIndex = completionIndex

    // let lookAhead = clamp(oldStableTextArray.length - completionIndex, 2, 6)
    let lookAhead = 4

    for (let nI = oldStableTextArray.length; nI < newStableTextArray.length; nI++) {
      newCompletionIndex = this.processSpeech('STABLE', newCompletionIndex, newStableTextArray[nI], lookAhead)
    }

    // Forced recovery when falling behind
    if (newCompletionIndex == this.state.completionIndex && oldStableTextArray.length - newCompletionIndex >= 6)
      newCompletionIndex += 2

    this.setState({ completionIndex: newCompletionIndex }, () => {
      console.log('Moving on? ', newCompletionIndex, TEXTS[currTextToRead].length - 1)
      if (newCompletionIndex == TEXTS[currTextToRead].length - 1) {
        this.onPressNext()
      }
    })

    this.stableTextArray = newStableTextArray
  }

  advanceUnstableIndex(newUnstableTextArray, fullText) {
    const oldUnstableTextArray = this.unstableTextArray

    let { completionIndex, unstableCompletionIndex } = this.state
    // let lookAhead = clamp(Math.abs(this.stableTextArray.length - completionIndex), 4, 6)
    // let lookAhead = 4
    let lookAhead = clamp(3 + (unstableCompletionIndex - completionIndex), 0, 7)

    for (let nI = 0; nI < newUnstableTextArray.length; nI++) {
      completionIndex = this.processSpeech('UNSTABLE', completionIndex, newUnstableTextArray[nI], lookAhead)

      if (completionIndex > this.state.unstableCompletionIndex) {
        this.setState({ unstableCompletionIndex: completionIndex })
      }
    }
  }

  onSpeechPartialResults(e) {
    // console.log('onSpeechPartial', e)

    const fullText = e.results.reduce((acc, result) => {
      return acc + result.alternatives[0].transcript
    }, '')

    const unstableText = e.results.filter(r => (r.stability < 0.5 && !r.isFinal)).reduce((acc, result) => {
      return acc + result.alternatives[0].transcript
    }, '')

    const stableText = e.results.filter(r => (r.stability >= 0.5 || r.isFinal)).reduce((acc, result) => {
      return acc + result.alternatives[0].transcript
    }, '')

    this.setState({ text: fullText })

    const newStableTextArray = textToArray(stableText)
    this.advanceStableIndex(newStableTextArray, fullText)
    this.stableTextArray = newStableTextArray


    const newUnstableTextArray = textToArray(unstableText)
    this.advanceUnstableIndex(newUnstableTextArray)
    this.unstableTextArray = newUnstableTextArray
  }

  async onPressStart() {
    await GoogleVoice.start()
    this._restartInterval = setTimeout(async () => {
      await this.onPressStop()
      await this.onPressStart()
    }, 45000)
  }

  async onPressStop() {
    if (this._restartInterval) {
      clearTimeout(this._restartInterval)
      this._restartInterval = null
    }
    await GoogleVoice.stop()
  }

  onPressClear() {
    this.setState({ text: '', totalText: '', completionIndex: -1, unstableCompletionIndex: -1 })
    this.stableTextArray = []
    this.unstableTextArray = []
  }

  onPressNext() {
    let currTextToRead = (this.state.currTextToRead + 1) % TEXTS.length
    this.setState({
      text: '',
      totalText: '',
      completionIndex: -1,
      unstableCompletionIndex: -1,
      currTextToRead: currTextToRead
    })
  }

  async componentDidMount() {
    await GoogleVoice.initialize({
      locale: 'en-US',
      apiKey: TEST_API_KEY,
      alternatives: 5
    })
  }

  render() {
    const { text, totalText, completionIndex, unstableCompletionIndex, listening, currTextToRead } = this.state
    const textToDisplay = totalText + text
    const textToRead = TEXTS[currTextToRead]
    // console.log('Texts: ', TEXTS, 'curr: ', currTextToRead)
    // const unstableCompletionIndex = completionIndex + 2
    // console.log('Text to read: ', textToRead)
    return (
      <StyledContainer>
        <TextContainer>
          { textToRead.map((word, index, arr) => {
            let color = 'black', lastChar = '', lastHlWord, sLastChar = '', sLastHlWord
            lastHlWord = arr[unstableCompletionIndex]
            sLastHlWord = arr[unstableCompletionIndex + 1]
            if (lastHlWord && lastHlWord.length) lastChar = lastHlWord[lastHlWord.length - 1]
            if (sLastHlWord && sLastHlWord.length) sLastChar = sLastHlWord[sLastHlWord.length - 1]

            if (index > unstableCompletionIndex && 
                index <= unstableCompletionIndex + 2 && 
                unstableCompletionIndex > completionIndex && 
                lastChar != '.' && 
                lastChar != ',' && 
                sLastChar != '.' && 
                sLastChar != ',') 
              color = 'rgba(128, 0, 128, 1)'
            if (index > completionIndex && index <= unstableCompletionIndex)
              color = 'rgba(128, 0, 200, 1)'
            if (index <= completionIndex)
              color = 'rgba(128, 0, 255, 1)'
            if (index <= unstableCompletionIndex - 4)
              color = 'black'
            return (<ReadText color={color}>{word} </ReadText>)
          })}
        </TextContainer>

        <BottomView>
          <TouchableOpacity onPress={this.onPressStart}>
           <StyledTextButton>Start listening</StyledTextButton>
          </TouchableOpacity>

          <TouchableOpacity onPress={this.onPressStop}>
           <StyledTextButton>Stop listening</StyledTextButton>
          </TouchableOpacity>

          <TouchableOpacity onPress={this.onPressClear}>
           <StyledTextButton>Clear</StyledTextButton>
          </TouchableOpacity>

          <StyledText>[ isListening: {listening ? '✅' : '🛑'} ]</StyledText>

        </BottomView>
        <TouchableOpacity onPress={this.onPressNext}>
         <StyledTextNext>[Next text]</StyledTextNext>
        </TouchableOpacity>
      </StyledContainer>
    )
  }

/*
        <View style={{marginBottom: 25}}>
          <StyledText>Google Speech Recognition</StyledText>
        </View>

        <View>
          <StyledText>{textToDisplay}</StyledText>
        </View>
*/
}