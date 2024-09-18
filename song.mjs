#!/home/zero/.asdf/shims/node
import * as ytMusic from 'node-youtube-music'
import { exec } from 'child_process'
import { tagger, askUser } from './tagger.mjs'
import 'consolecolors'

const [...query] = process.argv.slice(2)

const songs = (await ytMusic.searchMusics(`${query.join(' ')}`))
  .map(song => {
    return {
      title: song.title,
      artist: song.artists[0].name,
      album: song.album,
      id: song.youtubeId
    }
  })
  .slice(0, 5)
console.log('Found songs:')
songs.forEach((song, index) => {
  console.log(`${index + 1}. ${song.title.magenta} by ${song.artist.green} from album ${song.album.cyan}`)
})

const response = await askUser('Select song number to download (ctrl+c to abort): ')
const song = songs[response - 1]

song.title = song.title.replace(/"/g, '')
song.artist = song.artist.replace(/"/g, '')

const downloadCommand = `yt-dlp -x --audio-format mp3 --audio-quality 128k -o "${song.title} - ${song.artist}.%(ext)s" https://www.youtube.com/watch\?v\=${song.id}`

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
