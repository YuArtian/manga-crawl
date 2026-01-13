(function() {
    if (typeof preset.size != "undefined") {
        for(var rhkey in preset.size) {
            var zoneSize = preset.size[rhkey]["width"] + "x" + preset.size[rhkey]["height"];
            var rhzon = {
                "300x250" : {},
                "728x90" : {},
                "300x100" : {},
                "300x600" : {},
                "970x250" : {},
                "320x50" : {},
                "336x280" : {},
                "320x100" : {},
                "970x90" : {},
                "160x600" : {},
            };
            if (typeof rhzon[zoneSize] != "undefined") {
                var d = new Date();
                var n = d.getTime();
                var RhPayload = {
                    id: n,
                    imp: [{
                        id: n,
                        banner: {
                            w: preset.size[rhkey]["width"],
                            h: preset.size[rhkey]["height"],
                            format: [{
                                w: preset.size[rhkey]["width"],
                                h: preset.size[rhkey]["height"],
                            }]
                        },
                        tagid: "clickforce-adunit",
                    }],
                    site: {
                        publisher: {
                            id: "iGzitmsGNYVfOD73DF5e", //zon[zoneSize].publisherId,
                        },
                        page: location.href,
                        name: location.origin
                    },
                    cur: ["USD"],
                    test: 0
                };
                rhxhr(RhPayload);

                function rhxhr(RhPayload){
                    var RhXhr = new XMLHttpRequest();
                    RhXhr.onreadystatechange = function() {

                    if (RhXhr.readyState === 4 && RhXhr.status === 200 && RhXhr.response.length > 0) {
                        var RhJson = JSON.parse(RhXhr.response);
                        var Rhcpm = Math.round(RhJson[0].price * 1000000) / 1000000;
                        fbList[fbList.length] = {
                            "cpm": Rhcpm,
                            "bider": "rtbHouse",
                            "tag": RhJson[0].adm,
                            "impTag": "//ad.holmesmind.com/adserver/tp?tpid=" + zoneSize + "&tp=rtbHouse&c=" + Rhcpm,
                            "w" : RhJson[0].w,
                            "h" : RhJson[0].h,
                        }
                    }
                    };
                    RhXhr.withCredentials = true;
                    RhXhr.open("POST", "https://prebid-asia.creativecdn.com/bidder/prebid/bids", true);
                    RhXhr.send(JSON.stringify(RhPayload));                   
                }

            }
        }
    }
})();