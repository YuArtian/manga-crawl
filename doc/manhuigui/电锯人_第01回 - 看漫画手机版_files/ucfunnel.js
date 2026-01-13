(function () {
	try {
		if (typeof preset.size !== "undefined" && typeof preset.third_party_config.ucfunnel !== "undefined") {
			for (var brkey in preset.size) {
				var zoneSize = preset.size[brkey]["width"] + "x" + preset.size[brkey]["height"];
				var adidInfo = preset.third_party_config.ucfunnel.adid_info;
				var curSize = { w: preset.size[brkey]["width"], h: preset.size[brkey]["height"] }
				for (var i = 0; i < adidInfo.length; i++) {
					if (adidInfo[i].size === zoneSize) {
						var ucPayload = createUcPayload(adidInfo[i].adid, curSize);				
						callPrebidXhr(ucPayload, zoneSize, curSize);
					}
				}
			}
		}
	} catch (error) {
		console.log(error);
	}

	function createUcPayload(adid,curSize) {
		return {
			"ver": 'ADGENT_PREBID-2018011501',
			"referrer": location.origin,
			"adUnits": [{
				"mediaTypes": {
					"banner": {
						"sizes": [
							[curSize.w, curSize.h]
						]
					}
				},
				'bids': [{
					'bidder': 'ucfunnel',
					'params': {
						'adid': adid
					}
				}],
				"refererInfo": {
					"referer": location.origin,
					"reachedTop": true,
					"isAmp": false,
					"numIframes": 0,
					"stack": [location.origin],
					"canonicalUrl": null
				}
			}]
		};
	}

	function callPrebidXhr(ucPayload, zoneSize, size) {
		var newXhr = new XMLHttpRequest();
		newXhr.onreadystatechange = function () {
			if (newXhr.readyState === 4 && newXhr.status === 200 && Object.keys(newXhr.response).length > 0) {
				var newJson = JSON.parse(newXhr.response);
				var newcpm = Math.round(newJson.cpm * 1000000) / 1000000;
				fbList[fbList.length] = {
					"cpm": newcpm,
					"bider": "ucfunnel",
					"tag": newJson.adm,
					"impTag": "//ad.holmesmind.com/adserver/tp?tpid=" + zoneSize + "&tp=ucfunnel&c=" + newcpm,
					"w": newJson.width,
					"h": newJson.height
				};
			}
		};
		newXhr.withCredentials = true;
		newXhr.open("GET", `https://hb.aralego.com/header?ver=${ucPayload.ver}&ifr=0&bl=zh-TW&je=1&dnt=0&adid=${ucPayload.adUnits[0].bids[0].params.adid}&u=${encodeURIComponent(window.location.href)}&host=${window.location.host}&w=${size.w}&h=${size.h}`, true);
		newXhr.send(JSON.stringify(ucPayload));
	}
})();