#!/home/zero/.asdf/shims/node
import * as ytMusic from 'node-youtube-music'
import { exec } from 'child_process'
import { tagger, askUser } from './tagger.mjs'
import 'consolecolors'

const [...query] = process.argv.slice(2)

const songs = await ytMusic.searchMusics(`${query.join(' ')}`)
const song = {
  title: songs[0].title,
  artist: songs[0].artists[0].name,
  id: songs[0].youtubeId
}

console.log(`Found song ${song.title.magenta} by ${song.artist.green}`)

const response = await askUser('Is this the correct song? (y/n): ')
if (response !== 'y') {
  console.log('Process aborted'.red)
  process.exit(0)
}

const downloadCommand = `yt-dlp -x --audio-format mp3 --audio-quality 320k -o "${song.title} - ${song.artist}.%(ext)s" https://www.youtube.com/watch\?v\=${song.id}`

console.log('Downloading song...'.blue)
await new Promise(resolve => {
  exec(downloadCommand, (err) => {
    if (err) throw err
    resolve()
  })
})
console.log('Download complete'.green)
console.log('Tagging song...'.blue)
await tagger(song)
