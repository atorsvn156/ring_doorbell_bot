
/* required to save image files */
var fs = require('fs');
/* standard discord crap */
const { Client, Intents } = require('discord.js');
const { RingApi } = require('ring-client-api'),
  { readFile, writeFile } = require('fs'),
  { promisify } = require('util')

/* config */
const BOT_CONFIG = require("config.json");

// Create a new client instance
global.client = new Client({ intents: [Intents.FLAGS.GUILDS] });

/* Where the magick happens */
global.client.once('ready', () => {
	console.log('Ready!');
    async function example() {
        const { env } = process,
          ringApi = new RingApi({
          // This value comes from the .env file
          refreshToken: BOT_CONFIG['ring-auth'],
          // Listen for dings and motion events
          cameraDingsPollingSeconds: 2,
          debug: true,
        }),
        locations = await ringApi.getLocations(),
        allCameras = await ringApi.getCameras()
      
        console.log(
          `Found ${locations.length} location(s) with ${allCameras.length} camera(s).`
        )
      
        ringApi.onRefreshTokenUpdated.subscribe(
          async ({ newRefreshToken, oldRefreshToken }) => {
            console.log('Refresh Token Updated: ', newRefreshToken)
      
            // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
            // Here is an example using a .env file for configuration
            if (!oldRefreshToken) {
              return
            }
      
            const currentConfig = await promisify(readFile)('.env'),
              updatedConfig = currentConfig
                .toString()
                .replace(oldRefreshToken, newRefreshToken)
      
            await promisify(writeFile)('.env', updatedConfig)
          }
        )
      
        for (const location of locations) {
          let haveConnected = false
          location.onConnected.subscribe((connected) => {
            if (!haveConnected && !connected) {
              return
            } else if (connected) {
              haveConnected = true
            }
      
            const status = connected ? 'Connected to' : 'Disconnected from'
            console.log(`**** ${status} location ${location.name} - ${location.id}`)
          })
        }
      
        for (const location of locations) {
          const cameras = location.cameras,
            devices = await location.getDevices()
      
          global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(` \nLocation [REDACTED] has the following ${cameras.length} camera(s):`)
            
      
          for (const camera of cameras) {
              global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(`- ${camera.id}: ${camera.name} (${camera.deviceType})`)
          } 
          global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(         `\nLocation [REDACTED] device(s):`)
      
          for (const device of devices) {
                    global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(         `- ${device.zid}: ${device.name} (${device.deviceType})`)
      
          }
        }
      
        if (allCameras.length) {
          allCameras.forEach((camera) => {
            camera.onNewDing.subscribe((ding) => {
              const event =
                ding.kind === 'motion'
                  ? 'Motion detected'
                  : ding.kind === 'ding'
                  ? 'Doorbell pressed'
                  : `Video started (${ding.kind})`
      
              global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(          `${event} on ${camera.name} camera. Ding id ${
                  ding.id_str
                }.  Received at ${new Date()}`)
      
      async function get_image(camera) {
          const snapshotBuffer =  await camera.getSnapshot()
          console.log(snapshotBuffer)
          fs.writeFile('snapshot.png', snapshotBuffer,   (err) => {
            console.log('Error: ', err);
            global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send({ files: ["snapshot.png"] })
      
          }) 
      }
              get_image(camera)
      //global.client.channels.cache.get(BOT_CONFIG['discord-cam-channel']).send(``)
            })
          })
      
          console.log('Listening for motion and doorbell presses on your cameras.')
          }
      }
      
      try {
        example()
      } catch {
        console.log("something is off")
      }
      
})

global.client.login(BOT_CONFIG['discord-token']);
