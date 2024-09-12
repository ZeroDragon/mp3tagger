#!/home/zero/.asdf/shims/node

import axios from 'axios'
import readline from 'readline'
import terminalImage from 'terminal-image'
import NodeID3 from 'node-id3'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import 'consolecolors'

const fetchAlbumArt = async (url) => {
  return axios
    .get(url, { responseType: 'arraybuffer' })
    .then((response) => Buffer.from(response.data, 'binary'))
    .catch(() => {
      throw new YtdlMp3Error('Failed to fetch album art from endpoint: ' + url)
    })
}
const fetchResults = async url => {
  return axios
    .get(url)
    .then(res => res.data)
    .catch(() => {
      throw new Error('Failed to fetch results from endpoint: ' + url)
    })
}
export const askUser = prompt => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve, reject) => {
    rl.question(prompt, (response) => {
      rl.close()
      if (response) {
        resolve(response)
      } else {
        resolve(askUser(prompt))
        // reject(new Error('Invalid response: ' + response))
      }
    })
    rl.write('')
  })
}
const verifyResults = async (candidates, index = 0) => {
  if (index < 0) index = candidates.length - 1
  if (index >= candidates.length) index = 0
  const candidate = candidates[index]
  console.clear()
  const img = await fetchAlbumArt(candidate.artwork)
  console.log(await terminalImage.buffer(img, { width: '50%' }))
  console.log('Title:'.blue, candidate.title)
  console.log('Album:'.blue, candidate.album)
  console.log('Artist:'.blue, candidate.artist)
  console.log('Genre:'.blue, candidate.genre)
  console.log(`Result ${index + 1} of`, `${candidates.length}`.red)
  const response = await askUser('Is this the correct song? (y/n/p) (ctrl+c to cancel): ')
  if (response === 'y') {
    console.clear()
    return candidate
  }
  if (response === 'n') {
    const newIndex = index + 1
    return verifyResults(candidates, newIndex)
  }
  if (response === 'p') {
    const newIndex = index - 1
    return verifyResults(candidates, newIndex)
  }
}

export const tagger = async (song) => {
  const url = new URL('https://itunes.apple.com/search?')
  url.searchParams.set('media', 'music')
  url.searchParams.set('term', `${song.title} ${song.artist}`)

  const results = await fetchResults(url)
  const candidates = results.results
    .filter(result => {
      return result.trackName.toLowerCase() === song.title.toLowerCase() &&
        result.artistName.toLowerCase() === song.artist.toLowerCase()
    })
    .slice(0, 10)
    .map(result => {
      const albumUrl = result.artworkUrl100.replace('100x100', '600x600')
      return {
        title: result.trackName,
        artist: result.artistName,
        performerInfo: result.artistName,
        album: result.collectionName,
        artwork: albumUrl,
        releaseDate: result.releaseDate,
        genre: result.primaryGenreName,
        trackNumber: result.trackNumber
      }
    })
  if (candidates.length === 0) {
    console.log('No tag results found for the given song'.red)
    process.exit(1)
  }
  const data = await verifyResults(candidates)
  data.image = {
    description: 'Album Art',
    imageBuffer: await fetchAlbumArt(data.artwork),
    mime: 'image/png',
    type: {
      id: 3,
      name: 'front cover'
    }
  }
  delete data.artwork

  NodeID3.write(data, `${song.title} - ${song.artist}.mp3`)
}

const pathToThisFile = resolve(fileURLToPath(import.meta.url))
const pathPassedToNode = resolve(process.argv[1])
const isThisFileBeingRunViaCLI = pathToThisFile.includes(pathPassedToNode)

if (isThisFileBeingRunViaCLI) {
  const [file] = process.argv.slice(2)
  const fileName = file.split('.').slice(0, -1).join('.')
  const [title, artist] = fileName.split(' - ')
  console.log(title, 'by', artist)
  tagger({ title, artist })
}
