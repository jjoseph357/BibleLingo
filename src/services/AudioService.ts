import { Platform } from 'react-native';

class AudioService {
  private correctSound: any = null;
  private scribeSound: any = null;
  private finishSound: any = null;
  private rankupSound: any = null;
  private crownSound: any = null;

  async init() {
    // ── Web Platform: Standard HTML5 Audio (Double-Fallback & Self-Logging) ──
    if (Platform.OS === 'web') {
      try {
        let correctUrl = "";
        let scribeUrl = "";
        let finishUrl = "";
        let rankupUrl = "";
        let crownUrl = "";

        // 1. Try standard static require first (works directly on standard Webpack/Metro web builds)
        try {
          const cAsset = require('../../assets/sounds/correct.mp3');
          correctUrl = typeof cAsset === 'object' ? cAsset.default || cAsset.uri : cAsset;

          const sAsset = require('../../assets/sounds/bass_drop.mp3');
          scribeUrl = typeof sAsset === 'object' ? sAsset.default || sAsset.uri : sAsset;

          const fAsset = require('../../assets/sounds/finish.mp3');
          finishUrl = typeof fAsset === 'object' ? fAsset.default || fAsset.uri : fAsset;

          const rAsset = require('../../assets/sounds/rankup.mp3');
          rankupUrl = typeof rAsset === 'object' ? rAsset.default || rAsset.uri : rAsset;

          const crAsset = require('../../assets/sounds/crown.mp3');
          crownUrl = typeof crAsset === 'object' ? crAsset.default || crAsset.uri : crAsset;
        } catch (err) {
          console.warn("AudioService Web: Standard require failed, trying fallback...", err);
        }

        // 2. If require returned a number or empty, try Expo Asset module dynamically
        if (!correctUrl || typeof correctUrl === 'number') {
          try {
            const { Asset } = require('expo-asset');
            correctUrl = Asset.fromModule(require('../../assets/sounds/correct.mp3')).uri;
            scribeUrl = Asset.fromModule(require('../../assets/sounds/bass_drop.mp3')).uri;
            finishUrl = Asset.fromModule(require('../../assets/sounds/finish.mp3')).uri;
            rankupUrl = Asset.fromModule(require('../../assets/sounds/rankup.mp3')).uri;
            crownUrl = Asset.fromModule(require('../../assets/sounds/crown.mp3')).uri;
          } catch (err) {
            console.warn("AudioService Web: Dynamic Expo Asset loading failed.", err);
          }
        }

        console.log("AudioService Web Resolved Paths:", { correctUrl, scribeUrl, finishUrl });

        if (correctUrl) {
          this.correctSound = new window.Audio(correctUrl);
          this.correctSound.volume = 0.5;
        }
        if (scribeUrl) {
          this.scribeSound = new window.Audio(scribeUrl);
          this.scribeSound.volume = 0.5;
        }
        if (finishUrl) {
          this.finishSound = new window.Audio(finishUrl);
          this.finishSound.volume = 0.5;
        }
        if (rankupUrl) {
          this.rankupSound = new window.Audio(rankupUrl);
          this.rankupSound.volume = 0.5;
        }
        if (crownUrl) {
          this.crownSound = new window.Audio(crownUrl);
          this.crownSound.volume = 0.5;
        }
      } catch (e) {
        console.warn("AudioService Web: Failed to initialize standard HTML5 Audio.", e);
      }
      return;
    }

    // ── Mobile Platforms: Native expo-av Fallback (Dynamically required to silence Web warnings) ──
    try {
      const { Audio } = require('expo-av');
      const { Asset } = require('expo-asset');

      const correctUri = Asset.fromModule(require('../../assets/sounds/correct.mp3')).uri;
      const scribeUri = Asset.fromModule(require('../../assets/sounds/bass_drop.mp3')).uri;
      const finishUri = Asset.fromModule(require('../../assets/sounds/finish.mp3')).uri;
      const rankupUri = Asset.fromModule(require('../../assets/sounds/rankup.mp3')).uri;
      const crownUri = Asset.fromModule(require('../../assets/sounds/crown.mp3')).uri;

      const { sound: cSound } = await Audio.Sound.createAsync({ uri: correctUri }, { volume: 0.5 });
      this.correctSound = cSound;

      const { sound: sSound } = await Audio.Sound.createAsync({ uri: scribeUri }, { volume: 0.5 });
      this.scribeSound = sSound;

      const { sound: fSound } = await Audio.Sound.createAsync({ uri: finishUri }, { volume: 0.5 });
      this.finishSound = fSound;

      const { sound: rSound } = await Audio.Sound.createAsync({ uri: rankupUri }, { volume: 0.5 });
      this.rankupSound = rSound;

      const { sound: crSound } = await Audio.Sound.createAsync({ uri: crownUri }, { volume: 0.5 });
      this.crownSound = crSound;
    } catch (e) {
      console.warn("AudioService Mobile: Native expo-av sounds failed to load.", e);
    }
  }

  async playCorrect() {
    try {
      if (Platform.OS === 'web') {
        if (this.correctSound) {
          this.correctSound.currentTime = 0;
          await this.correctSound.play();
        }
      } else if (this.correctSound) {
        await this.correctSound.replayAsync();
      }
    } catch (e) {
      console.warn("Failed to play correct sound:", e);
    }
  }

  async playScribeFinish() {
    try {
      if (Platform.OS === 'web') {
        if (this.scribeSound) {
          this.scribeSound.currentTime = 0;
          await this.scribeSound.play();
        }
      } else if (this.scribeSound) {
        await this.scribeSound.replayAsync();
      }
    } catch (e) {
      console.warn("Failed to play scribe sound:", e);
    }
  }

  async playLessonFinish() {
    try {
      if (Platform.OS === 'web') {
        if (this.finishSound) {
          this.finishSound.currentTime = 0;
          await this.finishSound.play();
        }
      } else if (this.finishSound) {
        await this.finishSound.replayAsync();
      }
    } catch (e) {
      console.warn("Failed to play finish sound:", e);
    }
  }

  async playRankup() {
    try {
      if (Platform.OS === 'web') {
        if (this.rankupSound) {
          this.rankupSound.currentTime = 0;
          await this.rankupSound.play();
        }
      } else if (this.rankupSound) {
        await this.rankupSound.replayAsync();
      }
    } catch (e) {
      console.warn("Failed to play rankup sound:", e);
    }
  }

  async playCrown() {
    try {
      if (Platform.OS === 'web') {
        if (this.crownSound) {
          this.crownSound.currentTime = 0;
          await this.crownSound.play();
        }
      } else if (this.crownSound) {
        await this.crownSound.replayAsync();
      }
    } catch (e) {
      console.warn("Failed to play crown sound:", e);
    }
  }
}

export const audioService = new AudioService();
