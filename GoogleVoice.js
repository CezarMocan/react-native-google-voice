import React from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { NativeModules, NativeEventEmitter } from 'react-native'

const { RNGoogleVoice } = NativeModules;

// NativeEventEmitter is only availabe on React Native platforms, so this conditional is used to avoid import conflicts in the browser/server
const speechEventEmitter = Platform.OS !== "web" ? new NativeEventEmitter(RNGoogleVoice) : null;

class GoogleVoice {
  constructor() {
    this._listeners = null
    this._events = {
      'onSpeechStart': this._onSpeechStart.bind(this),
      'onSpeechEnd': this._onSpeechEnd.bind(this),
      'onSpeechPause': this._onSpeechPause.bind(this),
      'onSpeechResume': this._onSpeechResume.bind(this),
      'onSpeechPartialResults': this._onSpeechPartialResults.bind(this),
      'onSpeechResults': this._onSpeechResults.bind(this),
      'onSpeechError': this._onSpeechError.bind(this),
    }
  }
  destroy() {
    if (!this._listeners) return    
    this._listeners.map((listener, index) => listener.remove());
    this._listeners = null;
  }
  async initialize(props) {
    if (!this._listeners && speechEventEmitter !== null) {
       this._listeners = Object.keys(this._events).map((key, index) => speechEventEmitter.addListener(key, this._events[key]));
    }
    const locale = props.locale || 'en-US'
    const apiKey = props.apiKey || null
    const alternatives = props.alternatives || 10
    if (!apiKey) {
      console.error('You need an API key in order to access Google Voice API!')
      return
    }
    await RNGoogleVoice.initialize(locale, apiKey, alternatives)
  }

  async start() {
    await RNGoogleVoice.startListening()
  }
  async stop() {
    await RNGoogleVoice.stopListening()
  }
  async pause() {
    await RNGoogleVoice.pauseListening()
  }
  async resume() {
    await RNGoogleVoice.resumeListening()
  }

  _onSpeechStart(e) {
    if (this.onSpeechStart) {
      this.onSpeechStart(e)
    }
  }
  _onSpeechEnd(e) {
    if (this.onSpeechEnd) {
      this.onSpeechEnd(e)
    }    
  }
  _onSpeechPause(e) {
    if (this.onSpeechPause) {
      this.onSpeechPause(e)
    }    
  }
  _onSpeechResume(e) {
    if (this.onSpeechResume) {
      this.onSpeechResume(e)
    }    
  }
  _onSpeechPartialResults(e) {
    if (this.onSpeechPartialResults) {
      this.onSpeechPartialResults(e)
    }    
  }
  _onSpeechResults(e) {
    if (this.onSpeechResults) {
      this.onSpeechResults(e)
    }    
  }
  _onSpeechError(e) {
    if (this.onSpeechError) {
      this.onSpeechError(e)
    }    
  }
}

export default new GoogleVoice()