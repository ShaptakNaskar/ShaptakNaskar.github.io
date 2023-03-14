/**
 * Module that takes care of audio playback
 */
var audioEngine = {
    FADE_TIME: 1,
    audio_BUFFER_CACHE: {},
    _audioContext: null,
    _master: null,
    _currentBackgroundMusic: null,
    _currentEventaudio: null,
    _currentSoundEffectaudio: null,
    _initialized: false,
    init: function () {
        audioEngine._initaudioContext();
        // audioEngine._preloadaudio(); // removed to save bandwidth
        audioEngine._initialized = true;
    },
    _preloadaudio: function () {
        // start loading music and events early
        // ** could be used later if we specify a better set of
        // audio files to preload -- i.e. we probably don't need to load
        // the later villages or events audio, and esp. not the ending
        for (var key in audioLibrary) {
            if (
            key.toString().indexOf('MUSIC_') > -1 ||
            key.toString().indexOf('EVENT_') > -1) {
                audioEngine.loadaudioFile(audioLibrary[key]);
            }
        }
    },
    _initaudioContext: function () {
        audioEngine._audioContext = new (window.audioContext || window.webkitaudioContext);
        audioEngine._createMasterChannel();
    },
    _createMasterChannel: function () {
        // create master
        audioEngine._master = audioEngine._audioContext.createGain();
        audioEngine._master.gain.setValueAtTime(1.0, audioEngine._audioContext.currentTime);
        audioEngine._master.connect(audioEngine._audioContext.destination);
    },
    _getMissingaudioBuffer: function () {
        // plays beeping sound to indicate missing audio
        var buffer = audioEngine._audioContext.createBuffer(
            1,
            audioEngine._audioContext.sampleRate,
            audioEngine._audioContext.sampleRate
        );
        // Fill the buffer
        var bufferData = buffer.getChannelData(0);
        for (var i = 0; i < buffer.length / 2; i++) {
            bufferData[i] = Math.sin(i * 0.05) / 4; // max .25 gain value
        }
        return buffer;
    },
    _playSound: function (buffer) {
        if (audioEngine._currentSoundEffectaudio &&
            audioEngine._currentSoundEffectaudio.source.buffer == buffer) {
            return;
        }

        var source = audioEngine._audioContext.createBufferSource();
        source.buffer = buffer;
        source.onended = function(event) {
            // dereference current sound effect when finished
            if (audioEngine._currentSoundEffectaudio &&
                audioEngine._currentSoundEffectaudio.source.buffer == buffer) {
                audioEngine._currentSoundEffectaudio = null;
            }
        };

        source.connect(audioEngine._master);
        source.start();

        audioEngine._currentSoundEffectaudio = {
            source: source
        };
    },
    _playBackgroundMusic: function (buffer) {
        var source = audioEngine._audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        var envelope = audioEngine._audioContext.createGain();
        envelope.gain.setValueAtTime(0.0, audioEngine._audioContext.currentTime);
        
        var fadeTime = audioEngine._audioContext.currentTime + audioEngine.FADE_TIME;

        // fade out current background music
        if (audioEngine._currentBackgroundMusic && 
            audioEngine._currentBackgroundMusic.source &&
            audioEngine._currentBackgroundMusic.source.playbackState !== 0) {
            var currentBackgroundGainValue = audioEngine._currentBackgroundMusic.envelope.gain.value;
            audioEngine._currentBackgroundMusic.envelope.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
            audioEngine._currentBackgroundMusic.envelope.gain.setValueAtTime(currentBackgroundGainValue, audioEngine._audioContext.currentTime);
            audioEngine._currentBackgroundMusic.envelope.gain.linearRampToValueAtTime(0.0, fadeTime);
            audioEngine._currentBackgroundMusic.source.stop(fadeTime + 0.3); // make sure fade has completed
        }

        // fade in new backgorund music
        source.connect(envelope);
        envelope.connect(audioEngine._master);
        source.start();
        envelope.gain.linearRampToValueAtTime(1.0, fadeTime);

        // update current background music
        audioEngine._currentBackgroundMusic = {
            source: source,
            envelope: envelope
        };
    },
    _playEventMusic: function (buffer) {
        var source = audioEngine._audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        var envelope = audioEngine._audioContext.createGain();
        envelope.gain.setValueAtTime(0.0, audioEngine._audioContext.currentTime);

        var fadeTime = audioEngine._audioContext.currentTime + audioEngine.FADE_TIME * 2;

        // turn down current background music
        if (audioEngine._currentBackgroundMusic != null) {
            var currentBackgroundGainValue = audioEngine._currentBackgroundMusic.envelope.gain.value;
            audioEngine._currentBackgroundMusic.envelope.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
            audioEngine._currentBackgroundMusic.envelope.gain.setValueAtTime(currentBackgroundGainValue, audioEngine._audioContext.currentTime);
            audioEngine._currentBackgroundMusic.envelope.gain.linearRampToValueAtTime(0.2, fadeTime);
        }

        // fade in event music
        source.connect(envelope);
        envelope.connect(audioEngine._master);
        source.start();
        envelope.gain.linearRampToValueAtTime(1.0, fadeTime);

        // update reference
        audioEngine._currentEventaudio = {
            source: source,
            envelope: envelope
        };
    },
    _stopEventMusic: function () {
        var fadeTime = audioEngine._audioContext.currentTime + audioEngine.FADE_TIME * 2;

        // fade out event music and stop
        if (audioEngine._currentEventaudio && 
            audioEngine._currentEventaudio.source && 
            audioEngine._currentEventaudio.source.buffer) {
            var currentEventGainValue = audioEngine._currentEventaudio.envelope.gain.value;
            audioEngine._currentEventaudio.envelope.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
            audioEngine._currentEventaudio.envelope.gain.setValueAtTime(currentEventGainValue, audioEngine._audioContext.currentTime);
            audioEngine._currentEventaudio.envelope.gain.linearRampToValueAtTime(0.0, fadeTime);
            audioEngine._currentEventaudio.source.stop(fadeTime + 1); // make sure fade has completed
            audioEngine._currentEventaudio = null;
        }

        // turn up background music
        if (audioEngine._currentBackgroundMusic) {
          var currentBackgroundGainValue = audioEngine._currentBackgroundMusic.envelope.gain.value;
          audioEngine._currentBackgroundMusic.envelope.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
          audioEngine._currentBackgroundMusic.envelope.gain.setValueAtTime(currentBackgroundGainValue, audioEngine._audioContext.currentTime);
          audioEngine._currentBackgroundMusic.envelope.gain.linearRampToValueAtTime(1.0, fadeTime);
        }
    },
    isaudioContextRunning: function () {
        return audioEngine._audioContext.state !== 'suspended';
    },
    tryResumingaudioContext: function() {
        if (audioEngine._audioContext.state === 'suspended') {
            audioEngine._audioContext.resume();
        }
    },
    playBackgroundMusic: function (src) {
        if (!audioEngine._initialized) {
          return;
        }
        audioEngine.loadaudioFile(src)
            .then(function (buffer) {
                audioEngine._playBackgroundMusic(buffer);
            });
    },
    playEventMusic: function (src) {
        if (!audioEngine._initialized) {
          return;
        }
        audioEngine.loadaudioFile(src)
            .then(function (buffer) {
                audioEngine._playEventMusic(buffer);
            });
    },
    stopEventMusic: function () {
        if (!audioEngine._initialized) {
          return;
        }
        audioEngine._stopEventMusic();
    },
    playSound: function (src) {
        if (!audioEngine._initialized) {
          return;
        }
        audioEngine.loadaudioFile(src)
            .then(function (buffer) {
                audioEngine._playSound(buffer);
            });
    },
    loadaudioFile: function (src) {
        if (src.indexOf('http') === -1) {
            src = window.location + src;
        }
        if (audioEngine.audio_BUFFER_CACHE[src]) {
            return new Promise(function (resolve, reject) {
                resolve(audioEngine.audio_BUFFER_CACHE[src]);
            });
        } else {
            var request = new Request(src);
            return fetch(request).then(function (response) {
                return response.arrayBuffer();
            }).then(function (buffer) {
                if (buffer.byteLength === 0) {
                    console.error('cannot load audio from ' + src);
                    return audioEngine._getMissingaudioBuffer();
                }

                var decodeaudioDataPromise = audioEngine._audioContext.decodeaudioData(buffer, function (decodedData) {
                    audioEngine.audio_BUFFER_CACHE[src] = decodedData;
                    return audioEngine.audio_BUFFER_CACHE[src];
                });

                // Safari Webaudio does not return a promise based API for
                // decodeaudioData, so we need to fake it if we want to play
                // audio immediately on first fetch
                if (decodeaudioDataPromise) {
                    return decodeaudioDataPromise;
                } else {
                    return new Promise(function (resolve, reject) {
                        var fakePromiseId = setInterval(function() {
                            if (audioEngine.audio_BUFFER_CACHE[src]) {
                                resolve(audioEngine.audio_BUFFER_CACHE[src]);
                                clearInterval(fakePromiseId);
                            }
                        }, 20);
                    });
                }
            });
        }
    },
    setBackgroundMusicVolume: function (volume, s) {
        if (audioEngine._master == null) return;  // master may not be ready yet
        if (volume === undefined) {
            volume = 1.0;
        }
        if (s === undefined) {
            s = 1.0;
        }

        // cancel any current schedules and then ramp
        var currentBackgroundGainValue = audioEngine._currentBackgroundMusic.envelope.gain.value;
        audioEngine._currentBackgroundMusic.envelope.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
        audioEngine._currentBackgroundMusic.envelope.gain.setValueAtTime(currentBackgroundGainValue, audioEngine._audioContext.currentTime);
        audioEngine._currentBackgroundMusic.envelope.gain.linearRampToValueAtTime(
            volume,
            audioEngine._audioContext.currentTime + s
        );
    },
    setMasterVolume: function (volume, s) {
        if (audioEngine._master == null) return;  // master may not be ready yet
        if (volume === undefined) {
            volume = 1.0;
        }
        if (s === undefined) {
            s = 1.0;
        }

        // cancel any current schedules and then ramp
        var currentGainValue = audioEngine._master.gain.value;
        audioEngine._master.gain.cancelScheduledValues(audioEngine._audioContext.currentTime);
        audioEngine._master.gain.setValueAtTime(currentGainValue, audioEngine._audioContext.currentTime);
        audioEngine._master.gain.linearRampToValueAtTime(
            volume,
            audioEngine._audioContext.currentTime + s
        );
    }
};
