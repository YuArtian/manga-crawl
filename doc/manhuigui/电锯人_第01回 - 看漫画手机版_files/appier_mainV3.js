(function () {
  if (
    typeof preset.size != 'undefined' &&
    typeof preset.third_party_config.appier.channel != 'undefined'
  ) {
    var channel = preset.third_party_config.appier.channel;
    for (var apSizeIndex in preset.size) {
      var zoneSize =
        preset.size[apSizeIndex]['width'] +
        'x' +
        preset.size[apSizeIndex]['height'];
      let apmzon = {};
      if (country_from_adserver === 'HK') {
        apmzon = {
          Prebid_beauty_Girl_Mom: {
            '38x38': 'Wh9JmaA9',
          },
          Prebid_financial_man_Sport: {
            '38x38': 'Wh9JmaI9',
          },
        };
      } else {
        apmzon = {
          Prebid_News: {
            '970x250': 'HUW5m9Oc',
            '300x600': 'HUW5mzOc',
            '300x250': 'HUW5HFOc',
            '320x480': 'HUWeWzOc',
            '320x100': 'HUzFWIOc',
            '728x90': 'HUz5HIOc',
            '336x280': 'mhCQWIOZ',
            '18x18': 'mhCQHIOZ',
            // "1x1": "mhCQHIOZ",
            '38x38': 'Wh9FWtu9',
            // "1x1": "Wh9FWtu9",
          },
          Prebid_beauty_Girl_Mom: {
            '970x250': 'HUWtWzOc',
            '300x600': 'HUWtWIOc',
            '300x250': 'HUWtW9Oc',
            '320x480': 'HuWeWIOc',
            '320x100': 'HUzFWFOc',
            '728x90': 'HUz5HFOc',
            '336x280': 'mhCQWFOZ',
            '18x18': 'mhCQHFOZ',
            // "1x1": "mhCQHFOZ",
            '38x38': 'Wh9FWtA9',
            // "1x1": "Wh9FWtA9",
          },
          Prebid_financial_man_Sport: {
            '970x250': 'HUWtH9Oc',
            '300x600': 'HUWtHzOc',
            '300x250': 'HUWtWFOc',
            '320x480': 'HUWeWFOc',
            '320x100': 'HUzFH9Oc',
            '728x90': 'HUz5m9Oc',
            '336x280': 'mhCQH9OZ',
            '18x18': 'mhCQm9OZ',
            // "1x1": "mhCQm9OZ",
            '38x38': 'Wh9FWtI9',
            // "1x1": "Wh9FWtI9",
          },
          Prebid_social: {
            '970x250': 'HUWtHFOc',
            '300x600': 'HUWtm9Oc',
            '300x250': 'HUWtHIOc',
            '320x480': 'HUWeH9Oc',
            '320x100': 'HUzFHzOc',
            '728x90': 'HUz5mzOc',
            '336x280': 'mhCQHzOZ',
            '18x18': 'mhCQmzOZ',
            // "1x1": "mhCQmzOZ",
            '38x38': 'Wh9FWtC9',
            // "1x1": "Wh9FWtC9",
          },
          Prebid_plurk: {
            '300x250': 'HtAoWIOc',
          },
          Prebid_webptt: {
            '300x250': 'HtAoWFOc',
            '320x480': 'HtCeW9Oc',
          },
        };
      }
      if (typeof apmzon[channel] != 'undefined') {
        if (typeof apmzon[channel][zoneSize] != 'undefined') {
          var zoneSizeId = apmzon[channel][zoneSize];
          var d = new Date();
          var n = d.getTime();
          var APMpayload = {
            version: '1.0.0',
            refererInfo: {
              numIframes: 0,
              reachedTop: true,
              referer: location.href,
              stack: [location.href],
            },
            bids: [
              {
                adUnitCode: '8936',
                auctionId: '3f5795f3-c004-4fb4-a634-' + n,
                bidId: '273ff' + n,
                bidRequestsCount: 1,
                bidder: 'appier',
                bidderRequestId: '1b146c' + n,
                mediaTypes: {
                  banner: {
                    sizes: [
                      [
                        preset.size[apSizeIndex]['width'],
                        preset.size[apSizeIndex]['height'],
                      ],
                    ],
                  },
                },
                params: {
                  hzid: zoneSizeId,
                },
                sizes: [
                  [
                    preset.size[apSizeIndex]['width'],
                    preset.size[apSizeIndex]['height'],
                  ],
                ],
                src: 'client',
                transactionId: 'b4ff7b40-376e-414a-b4de' + n,
              },
            ],
          };
          APMXhr(APMpayload, zoneSize, preset, apSizeIndex, zoneSizeId);
        }
      }
    }

    function APMXhr(APMpayload, zoneSize, preset, apSizeIndex, zoneSizeId) {
      var APMXhr = new XMLHttpRequest();
      APMXhr.onreadystatechange = function () {
        if (
          APMXhr.readyState === 4 &&
          APMXhr.status === 200 &&
          APMXhr.response.length > 0
        ) {
          var APMJson = JSON.parse(APMXhr.response);
          if (typeof APMJson[0] != 'undefined') {
            var APMcpm = Math.round(APMJson[0].cpm * 1000000) / 1000000 / 30;
            fbList[fbList.length] = {
              cpm: APMcpm,
              bider: 'appier_main',
              tag: APMJson[0].ad.replace(/\${AUCTION_PRICE}/g, APMJson[0].cpm),
              impTag:
                '//ad.holmesmind.com/adserver/tp?tpid=' +
                zoneSizeId +
                '&tp=appier_main&c=' +
                APMcpm,
              w: preset.size[apSizeIndex]['width'],
              h: preset.size[apSizeIndex]['height'],
            };
          }
        }
      };
      APMXhr.withCredentials = true;
      APMXhr.open('POST', 'https://ad2.apx.appier.net/v1/prebid/bid', true);
      APMXhr.send(JSON.stringify(APMpayload));
    }
  }
})();
