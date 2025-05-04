chrome.action.onClicked.addListener(async (tab) => {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["scroll.js"]
    });
  });
  
  function loginToImgur(callback) {
    const authUrl = `https://api.imgur.com/oauth2/authorize?client_id=71cfb0743bf5099&response_type=token`;
  
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error("Login failed:", chrome.runtime.lastError);
          return;
        }
  
        const token = new URLSearchParams(new URL(redirectUrl).hash.slice(1)).get("access_token");
  
        if (token) {
          console.log("Imgur access token:", token);
          chrome.storage.local.set({ imgurAccessToken: token }, () => {
            if (callback) callback(token);
          });
        } else {
          console.warn("No access token found.");
        }
      }
    );
  }
  
  function showStitchedImage(captures) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
  
    const sampleImg = new Image();
    sampleImg.onload = () => {
      const width = sampleImg.width;
      const height = captures.length * sampleImg.height;
  
      canvas.width = width;
      canvas.height = height;
  
      const imgPromises = captures.map(({ image }, i) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, i * img.height);
            resolve();
          };
          img.src = image;
        });
      });
  
      Promise.all(imgPromises).then(() => {
        const dataUrl = canvas.toDataURL("image/png");
        const base64Image = dataUrl.split(",")[1];
  
        // Download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "fullpage.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
  
        // Upload to Imgur
        chrome.storage.local.get("imgurAccessToken", ({ imgurAccessToken }) => {
          if (!imgurAccessToken) {
            loginToImgur((newToken) => uploadToImgur(newToken, base64Image));
          } else {
            uploadToImgur(imgurAccessToken, base64Image);
          }
        });
      });
    };
  
    sampleImg.src = captures[0].image;
  }
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);
  
    if (message.action === "capture") {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        sendResponse(dataUrl);
      });
      return true;
    }
  
    if (message.action === "done") {
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: (captures, title, dateStr) => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
      
            const sampleImg = new Image();
            sampleImg.onload = () => {
              const width = sampleImg.width;
              const height = captures.length * sampleImg.height;
      
              canvas.width = width;
              canvas.height = height;
      
              const imgPromises = captures.map(({ image }, i) => {
                return new Promise((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    ctx.drawImage(img, 0, i * img.height);
                    resolve();
                  };
                  img.src = image;
                });
              });
      
              Promise.all(imgPromises).then(() => {
                const dataUrl = canvas.toDataURL("image/png");
                const filename = `${dateStr}_${title.replace(/[\\/:*?"<>|]/g, "_")}.png`; 
      
                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              });
            };
      
            sampleImg.src = captures[0].image;
          },
          args: [message.captures, message.title, message.date],
        });
      }
      
      
  });
  