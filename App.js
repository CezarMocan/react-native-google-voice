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
  color: ${props => props.complete ? 'green' : 'black'};
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
      listening: false,
      currTextToRead: 0
    }

    this._restartInterval = null
  }

  processSpeech(text) {
    const textToRead = TEXTS[this.state.currTextToRead]
    const textArray = text.split(' ').filter(word => word != ' ' && word != '')
    // console.log(textArray)

    const lastWord = textArray[textArray.length - 1]

    const chillFactor = 6
    const { completionIndex } = this.state
    let newCompletionIndex = completionIndex

    for (let index = completionIndex + 1; index < completionIndex + chillFactor; index++) {
      // console.log('Comparing: ', lastWord, textToRead[index])
      if (newCompletionIndex > completionIndex) continue
      if (index < textToRead.length && lastWord.toLowerCase() == textToRead[index].toLowerCase()) {
        newCompletionIndex = index
        // index = completionIndex + chillFactor
      }
    }

    // console.log(newCompletionIndex, text)
    this.setState({ text, completionIndex: newCompletionIndex })
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
      text: ''
    })
    // console.log('onSpeechResults', e)
  }

  onSpeechPartialResults(e) {
    // console.log('onSpeechPartial', e)
    const text = e.results.reduce((acc, result) => {
      return acc + result.alternatives[0].transcript
    }, '')

    // console.log(text)
    this.processSpeech(text)
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
    this.setState({ text: '', totalText: '', completionIndex: -1 })
  }

  onPressNext() {
    let currTextToRead = (this.state.currTextToRead + 1) % TEXTS.length
    this.setState({
      text: '',
      totalText: '',
      completionIndex: -1,
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
    const { text, totalText, completionIndex, listening, currTextToRead } = this.state
    const textToDisplay = totalText + text
    const textToRead = TEXTS[currTextToRead]
    return (
      <StyledContainer>
        <View style={{marginBottom: 25}}>
          <StyledText>Google Speech Recognition</StyledText>
        </View>

        <TextContainer>
          { textToRead.map((word, index) => {
            return (<ReadText complete={completionIndex >= index}>{word} </ReadText>)
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