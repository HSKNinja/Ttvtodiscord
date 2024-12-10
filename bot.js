const tmi = require('tmi.js');
const axios = require('axios');
const config = require('./config.json');


const twitchClient = new tmi.Client({
  options: { debug: true },
  identity: {
    username: config.twitchApi.botNickname,
    password: config.twitchApi.oauthToken
  },
  channels: [config.twitchApi.channelName]
});


twitchClient.connect().catch(console.error);


const webhookUrl = config.discord.webhookUrl;


async function getTwitchUserInfo(username) {
  try {
    const response = await axios.get(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        'Client-ID': config.twitchApi.clientId,
        'Authorization': `Bearer ${config.twitchApi.accessToken}`
      }
    });
    return response.data.data[0];
  } catch (error) {
    if (error.response) {
      console.error(`Error fetching Twitch user info: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error(`Error fetching Twitch user info: No response received`);
    } else {
      console.error(`Error fetching Twitch user info: ${error.message}`);
    }
    return null;
  }
}


function getBadges(tags) {
  const badgeEmojis = {
    broadcaster: '🔴', 
    moderator: '🛠️', 
    vip: '💎', 
    subscriber: '❤️', 
    founder: '⚜️', 
    
  };

  let badges = '';
  if (tags.badges) {
    for (const badge in tags.badges) {
      if (badgeEmojis[badge]) {
        badges += badgeEmojis[badge] + ' ';
      }
    }
  }
  return badges.trim();
}


twitchClient.on('message', async (channel, tags, message, self) => {
  if (self) return; 

  const username = tags['display-name'] || tags['username'];
  const userInfo = await getTwitchUserInfo(username);

  if (userInfo) {
    const badges = getBadges(tags);
    let formattedMessage = message;
    let fullUsername = `${username} ${badges}`;

    
    if (tags.badges && tags.badges.moderator) {
      formattedMessage = `**${formattedMessage}**`;
    }

    
    if (tags.badges && tags.badges.vip) {
      formattedMessage = `*${formattedMessage}*`;
    }

    
    if (tags.badges && tags.badges.broadcaster) {
      formattedMessage = `***${formattedMessage}***`;
    }

    axios.post(webhookUrl, {
      username: fullUsername,
      avatar_url: userInfo.profile_image_url,
      content: formattedMessage
    }).catch(console.error);
  } else {
    console.error('Could not fetch user info');
  }
});
