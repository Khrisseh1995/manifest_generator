<template>
  <div class="hello">
    <h1>VOD SSAI Demo</h1>
    <!-- <video @timeupdate="getTimeUpdate($event)" @loadedmetadata="changeAdSource" ref="videoPlayer" class="video-js"></video> -->
    <video @timeupdate="getTimeUpdate($event)" ref="videoPlayer" class="video-js"></video>
    <button @click="testClick">Play Me!</button>
  </div>
</template>

<script>
import "video.js/dist/video-js.css";

import videojs from "video.js";

export default {
  name: "HelloWorld",
  data() {
    return {
      duration: 0,
      showAd: true,
      player: null,
      changed: false,
      options: {
        autoplay: true,
        controls: true,
        sources: [
          {
            // src: "http://localhost:7003/manifest_from_s3",
            src: `http://localhost:7003/send_fake_local_manifest`,
            // src: "https://hboremixbucket.s3.amazonaws.com/manifests/c751ad89-6951-43ab-8c26-d7df751dcece/generated_master_playlist.m3u8",
            type: "application/x-mpegURL"
          }
        ]
      }
    };
  },
  computed: {
    showAdComp() {
      return !!this.showAd;
    }
  },
  methods: {
    getTimeUpdate() {
      const playerTime = this.player.currentTime();       
      if(playerTime >= 10) {
        this.player.duration = () => this.duration - 10;
      }
      
    },
    testClick(event) {
     
      console.log(event);
      console.log(this.player.duration());
    },
    changeAdSource() {
      if (!this.changed) {
        this.changed = true;
        this.player.src({
          type: "application/x-mpegURL",
          // src: `http://localhost:7000/generate_standard_manifest?adShown=${this.showAd}`
          src: "http://localhost:7003/manifest"
        });
        // this.options.sources[0].src = `http://localhost:7000/generate_standard_manifest?showAd=${this.showAdComp}`;
        console.log("Media Started");
      }
      if (!this.duration) {
        this.duration = this.player.duration();
      }

      this.player.duration = () => {
        return 10;
      };
    }
  },
  mounted() {
    this.player = videojs(this.$refs.videoPlayer, this.options, player => {
      console.log(player);
      this.player.duration();
      console.log("Player Ready");
    });
    // console.log(this.player);
    // console.log(this.player.duration);
    // this.player.duration = () => {
    //   return 10;
    // }

    // this.player.use("*", myMiddleware);
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
