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
import { textToRead2, textToRead3, textToRead4, textToRead5, textToRead6, textToRead7 } from './Text'
import { similarityScore, textToArray } from './utils'

const TEXTS = [textToRead2, textToRead3, textToRead4, textToRead5, textToRead6, textToRead7]

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

const StyledText = styled(Text)`
  color: black;
  font-size: 16px;
`

const StyledTextButton = styled(Text)`
  color: black;
  font-size: 20px;
  margin: 0 10px;
`

const ReadText = styled(Text)`
  color: ${props => props.color};
  font-size: 16px;
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
      unstableCompletionIndex: this.state.completionIndex,
      text: ''
    })
    this.stableTextArray = []
    this.unstableTextArray = []
    // console.log('onSpeechResults', e)
  }

  processSpeech(completionIndex, lastWord, chillFactor = 3) {
    const textToRead = TEXTS[this.state.currTextToRead]
    // const chillFactor = 3

    let newCompletionIndex = completionIndex

    for (let index = completionIndex + 1; index <= Math.min(completionIndex + chillFactor, textToRead.length); index++) {
      const score = similarityScore(lastWord, textToRead[index])
      if (score >= 0.66) return index
    }

    return completionIndex
  }

  advanceStableIndex(newStableTextArray, fullText) {
    const oldStableTextArray = this.stableTextArray

    let { completionIndex } = this.state

    for (let nI = oldStableTextArray.length; nI < newStableTextArray.length; nI++) {
      completionIndex = this.processSpeech(completionIndex, newStableTextArray[nI])
      this.setState({ completionIndex })
    }

    this.stableTextArray = newStableTextArray
  }

  advanceUnstableIndex(newUnstableTextArray, fullText) {
    const oldUnstableTextArray = this.unstableTextArray

    let { completionIndex } = this.state

    for (let nI = 0; nI < newUnstableTextArray.length; nI++) {
      completionIndex = this.processSpeech(completionIndex, newUnstableTextArray[nI], 4)

      if (completionIndex > this.state.unstableCompletionIndex) {
        this.setState({ unstableCompletionIndex: completionIndex })
      }
    }
  }

  onSpeechPartialResults(e) {
    console.log('onSpeechPartial', e)

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

    // console.log('prev unstableText is: ', this.unstableTextArray)
    // console.log('unstableText is: ', unstableTextArray)

    // let startPosition = Math.max(this.unstableTextArray.length - 1, 0)
    // if (this.unstableTextArray.length == unstableTextArray.length) {
    //   while (this.unstableTextArray[startPosition] != unstableTextArray[startPosition] && startPosition > 0)
    //     startPosition--
    // }

    // let lastMatchIndex = startPosition - 1
    // for (let i = startPosition; i < unstableTextArray.length; i++) {
    //   console.log('Calling unstableText recognition for: ', unstableTextArray[i])
    //   const foundMatch = this.processSpeech(fullText, unstableTextArray[i])
    //   if (foundMatch) lastMatchIndex = i
    // }

    // this.stableTextArray = stableTextArray
    // this.unstableTextArray = unstableTextArray.slice(lastMatchIndex + 1)
    // ^ is wrong--what we need is to exclude the already matched words from being called processSpeech() on again.
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
    // const unstableCompletionIndex = completionIndex + 2
    return (
      <StyledContainer>
        <View style={{marginBottom: 25}}>
          <StyledText>Google Speech Recognition</StyledText>
        </View>

        <TextContainer>
          { textToRead.map((word, index) => {
            let color = 'black'
            if (index > completionIndex && index <= unstableCompletionIndex)
              color = 'blue'
            if (index <= completionIndex)
              color = 'green'
            return (<ReadText color={color}>{word} </ReadText>)
          })}
        </TextContainer>

        <View>
          <StyledText>{textToDisplay}</StyledText>
        </View>

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

          <TouchableOpacity onPress={this.onPressNext}>
           <StyledTextButton>[Next text]</StyledTextButton>
          </TouchableOpacity>

          <StyledText>[ isListening: {listening ? '✅' : '🛑'} ]</StyledText>
        </BottomView>

      </StyledContainer>
    )
  }
}