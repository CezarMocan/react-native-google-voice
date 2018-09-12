#import "RNGoogleVoiceModule.h"

#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>

#import <React/RCTLog.h>
#import <React/RCTUtils.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTConvert.h>

#import "google/cloud/speech/v1/CloudSpeech.pbrpc.h"
#import "AudioController.h"
#import "SpeechRecognitionService.h"

#define SAMPLE_RATE 16000.0f

@interface RNGoogleVoiceModule () <AudioControllerDelegate>
@property (nonatomic, strong) NSMutableData *audioData;
@property (nonatomic, readwrite) NSString* locale;
@property (nonatomic, readwrite) NSString* apiKey;
@property (nonatomic, readwrite) NSNumber* alternatives;
@end

@implementation RNGoogleVoiceModule

- (NSArray<NSString *> *)supportedEvents
{
  return @[
           @"onSpeechStart",
           @"onSpeechEnd",
           @"onSpeechPause",
           @"onSpeechResume",
           @"onSpeechPartialResults",
           @"onSpeechResults",
           @"onSpeechError",
           @"onSilenceDetected"
           ];
}

RCT_EXPORT_MODULE(RNGoogleVoice)

RCT_REMAP_METHOD(initialize,
                 locale:(nonnull NSString*)locale
                 apiKey:(nonnull NSString*)apiKey
                 alternatives:(nonnull NSNumber*)alternatives
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [AudioController sharedInstance].delegate = self;
  self.locale = locale;
  self.apiKey = apiKey;
  self.alternatives = alternatives;
  RCTLogInfo(@"initialize with locale: %@ and API_KEY %@", locale, apiKey);
  resolve(@{});
}

RCT_REMAP_METHOD(startListening,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if ([self startListening]) {
    resolve(@{});
  } else {
    reject(@"failed_start_listening", @"Failed to start listening", nil);
  }
}

RCT_REMAP_METHOD(stopListening,
                 stopResolver:(RCTPromiseResolveBlock)resolve
                 stopRejecter:(RCTPromiseRejectBlock)reject)
{
  if ([self stopListening]) {
    resolve(@{});
  } else {
    reject(@"stop_listening_error", @"Encountered error in stopping listening", nil);
  }
}

RCT_REMAP_METHOD(pauseListening,
                 pauseResolver:(RCTPromiseResolveBlock)resolve
                 pauseRejecter:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"pauseListening");
  resolve(@{});
}

RCT_REMAP_METHOD(resumeListening,
                 resumeResolver:(RCTPromiseResolveBlock)resolve
                 resumeRejecter:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"resumeListening");
  resolve(@{});
}

-(BOOL)startListening
{
  @try {
    AVAudioSession *audioSession = [AVAudioSession sharedInstance];
    [audioSession setCategory:AVAudioSessionCategoryRecord error:nil];
    
    _audioData = [[NSMutableData alloc] init];
    [[AudioController sharedInstance] prepareWithSampleRate:SAMPLE_RATE];
    [[SpeechRecognitionService sharedInstance] setSampleRate:SAMPLE_RATE];
    [[AudioController sharedInstance] start];
  } @catch (NSException *e) {
    RCTLogWarn(@"Caught exception in startListening: %@", e);
    return false;
  }
  
  return true;
}

-(BOOL)stopListening
{
  @try {
    [[AudioController sharedInstance] stop];
    [[SpeechRecognitionService sharedInstance] stopStreaming];
  } @catch (NSException *e) {
    RCTLogWarn(@"Caught exception in stopListening: %@", e);
    return false;
  }
  return true;
}

- (void) processSampleData:(NSData *)data
{
  [self.audioData appendData:data];
  NSInteger frameCount = [data length] / 2;
  int16_t *samples = (int16_t *) [data bytes];
  int64_t sum = 0;
  for (int i = 0; i < frameCount; i++) {
    sum += abs(samples[i]);
  }
  NSLog(@"audio %d %d", (int) frameCount, (int) (sum * 1.0 / frameCount));
  
  // We recommend sending samples in 100ms chunks
  int chunk_size = 0.1 /* seconds/chunk */ * SAMPLE_RATE * 2 /* bytes/sample */ ; /* bytes/chunk */
  
  if ([self.audioData length] > chunk_size) {
    NSLog(@"SENDING");
    [[SpeechRecognitionService sharedInstance] streamAudioData:self.audioData
                                                    withLocale:self.locale
                                                    withApiKey:self.apiKey
                                           withMaxAlternatives:self.alternatives
                                                withCompletion:^(StreamingRecognizeResponse *response, NSError *error) {
                                                  if (error) {
                                                    RCTLogWarn(@"ERROR: %@", error);
                                                    [self stopListening];
                                                  } else if (response) {
                                                    BOOL finished = NO;
                                                    RCTLogInfo(@"RESPONSE: %@", response);
                                                    for (StreamingRecognitionResult *result in response.resultsArray) {
                                                      if (result.isFinal) {
                                                        finished = YES;
                                                      }
                                                    }
                                                    RCTLogInfo(@"Got response: %@", [response description]);
                                                    NSArray *results = [self parseResponse:response];
                                                    [self sendEventWithName:@"onSpeechPartialResults" body:@{@"results":results}];
                                                    if (finished) {
                                                        [self sendEventWithName:@"onSpeechResults" body:@{@"results":results}];
                                                    }
                                                  }
                                                }
     ];
    self.audioData = [[NSMutableData alloc] init];
  }
}

- (NSArray*) parseResponse:(StreamingRecognizeResponse*) originalResponse
{
  NSMutableArray *results = [NSMutableArray arrayWithCapacity:0];
  
  for (StreamingRecognitionResult *result in originalResponse.resultsArray) {
    BOOL isFinal = result.isFinal;
    float stability = result.stability;
    NSMutableArray *alternatives = [NSMutableArray arrayWithCapacity:0];
    
    for (SpeechRecognitionAlternative *alternative in result.alternativesArray) {
      [alternatives addObject:@{
                                @"confidence":[NSNumber numberWithFloat:alternative.confidence],
                                @"transcript":alternative.transcript
                                }];
    }
    
    [results addObject:@{
                         @"isFinal":[NSNumber numberWithBool:isFinal],
                         @"stability":[NSNumber numberWithFloat:stability],
                         @"alternatives":alternatives
                         }];
  }
  
  return results;
}


@end
