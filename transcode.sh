# ffmpeg -loglevel debug -threads 4 -vsync 1 -i https://live.rte.ie/live/b/channel3/news.isml/.m3u8?dvr_window_length=30 \
# -vf yadif -g 29.97 -r 29.97 \
# -b:v:0 5250k -c:v h264_nvenc -preset llhq -rc:v vbr_hq -pix_fmt yuv420p -profile:v main -level 4.1 -strict_gop 1 -rc-lookahead 32 -no-scenecut 1 -forced-idr 1 -gpu 0 \
# -b:v:1 4200k -c:v h264_nvenc -preset llhq -rc:v vbr_hq -pix_fmt yuv420p -profile:v main -level 4.1 -strict_gop 1 -rc-lookahead 32 -no-scenecut 1 -forced-idr 1 -gpu 1 \
# -b:v:1 3150k -c:v h264_nvenc -preset llhq -rc:v vbr_hq -pix_fmt yuv420p -profile:v main -level 4.1 -strict_gop 1 -rc-lookahead 32 -no-scenecut 1 -forced-idr 1 -gpu 2 \
# -b:a:0 256k \
# -b:a:0 192k \
# -b:a:0 128k \
# -c:a aac -ar 48000  -map 0:v -map 0:a:0 -map 0:v -map 0:a:0 -map 0:v -map 0:a:0 \
# -f hls -var_stream_map "v:0,a:0  v:1,a:1 v:2,a:2" \
# -master_pl_name  master.m3u8 -t 300 -hls_time 10 -hls_init_time 4 -hls_list_size 10 -master_pl_publish_rate 10 -hls_flags delete_segments+discont_start+split_by_time  \
# manifest.m3u8

# ffmpeg -re -i https://live.rte.ie/live/b/channel3/news.isml/news-audio_128k=128000.m3u8?dvr_window_length=30 -b:a:0 32k -b:a:1 64k -b:v:0 1000k -b:v:1 3000k  \
#   -map 0:a -map 0:a -map 0:v -map 0:v -f hls \
#   -var_stream_map "a:0,agroup:aud_low a:1,agroup:aud_high v:0,agroup:aud_low v:1,agroup:aud_high" \
#   -master_pl_name master.m3u8 output1.m3u8

  ffmpeg -i "https://live.rte.ie/live/b/channel3/news.isml/.m3u8?dvr_window_length=30" -map p:7 -c copy  "video.ts"

# ffmpeg -i https://live.rte.ie/live/b/channel3/news.isml/news-audio_128k=128000.m3u8?dvr_window_length=30 -i \
# -i https://live.rte.ie/live/b/channel3/news.isml/news-video=144960.m3u8?dvr_window_length=30 \
# map 1 - -acodec -vcodec output1.aac