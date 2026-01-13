(function () {
  if (
    typeof preset.size != 'undefined' &&
    typeof preset.third_party_config.bridgewell.channel != 'undefined'
  ) {
    var channel = preset.third_party_config.bridgewell.channel;
    for (var brkey in preset.size) {
      var zoneSize = preset.size[brkey]['width'] + 'x' + preset.size[brkey]['height'];
      var bwzon = {
        Prebid_News: {
          '970x250': 17452,
          '970x90': 17453,
          '728x90': 17454,
          '300x600': 17455,
          '160x600': 17456,
          '336x280': 17457,
          '300x250': 17458,
          '320x100': 17459,
          '300x100': 17460,
          '320x50': 17461
        },
        Prebid_Comics_and_Novels: {
          '970x250': 19618,
          '970x90': 19619,
          '728x90': 19620,
          '300x600': 19621,
          '160x600': 19622,
          '336x280': 19623,
          '300x250': 19624,
          '320x100': 19625,
          '300x100': 19626,
          '320x50': 19627
        },
        Prebid_Farms: {
          '970x250': 19608,
          '970x90': 19609,
          '728x90': 19610,
          '300x600': 19611,
          '160x600': 19612,
          '336x280': 19613,
          '300x250': 19614,
          '320x100': 19615,
          '300x100': 19616,
          '320x50': 19617
        }
      };
      if (typeof bwzon[channel] != 'undefined') {
        if (typeof bwzon[channel][zoneSize] != 'undefined') {
          var zonCid = bwzon[channel][zoneSize] ? bwzon[channel][zoneSize] : undefined;
          var d = new Date();
          var n = d.getTime();
          var BwPayload = {
            version: {
              prebid: '4.35.0',
              bridgewell: '0.0.3'
            },
            inIframe: false,
            url: location.href,
            referrer: location.origin,
            adUnits: [
              {
                cid: zonCid,
                adUnitCode: 'cfadz',
                requestId: '2895e26' + n,
                mediaTypes: {
                  banner: {
                    sizes: [[preset.size[brkey]['width'], preset.size[brkey]['height']]]
                  }
                }
              }
            ],
            refererInfo: {
              referer: location.origin,
              reachedTop: true,
              isAmp: false,
              numIframes: 0,
              stack: [location.origin],
              canonicalUrl: null
            }
          };
          bwXhr(BwPayload, zoneSize, preset);
        }
      }
    }
    function bwXhr(BwPayload, zoneSize, preset) {
      var BwXhr = new XMLHttpRequest();
      BwXhr.onreadystatechange = function () {
        if (BwXhr.readyState === 4 && BwXhr.status === 200 && BwXhr.response.length > 0) {
          var BwJson = JSON.parse(BwXhr.response);
          var Bwcpm = Math.round(BwJson[0].cpm * 1000000) / 1000000;
          fbList[fbList.length] = {
            cpm: Bwcpm,
            bider: 'bridgewell',
            tag: BwJson[0].ad,
            impTag:
              '//ad.holmesmind.com/adserver/tp?tpid=' + zoneSize + '&tp=bridgewell&c=' + Bwcpm,
            w: BwJson[0].width,
            h: BwJson[0].height
          };
        }
      };
      BwXhr.withCredentials = true;
      BwXhr.open('POST', 'https://prebid.scupio.com/recweb/prebid.aspx?cb=' + Math.random(), true);
      BwXhr.send(JSON.stringify(BwPayload));
    }
  }
})();
