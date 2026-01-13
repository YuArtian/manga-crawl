(function() {
    try{
        if (typeof preset.size != "undefined") {
            for(var ctkey in preset.size) {
                var zoneSize = preset.size[ctkey]["width"] + "x" + preset.size[ctkey]["height"];
                var zon = {
                    "160x600": {
                        "impid": "div-criteo-1007256",
                        "zoneid": 1007256
                    },
                    "300x250": {
                        "impid": "div-criteo-1007257",
                        "zoneid": 1007257
                    },
                    "300x600": {
                        "impid": "div-criteo-1007258",
                        "zoneid": 1007258
                    },
                    "728x90": {
                        "impid": "div-criteo-1007259",
                        "zoneid": 1007259
                    },
                    "970x90": {
                        "impid": "div-criteo-1525021",
                        "zoneid": 1525021
                    },
                    "336x280": {
                        "impid": "div-criteo-1525020",
                        "zoneid": 1525020
                    },        
                    "300x100": {
                        "impid": "div-criteo-1762816",
                        "zoneid": 1762816
                    },        
                    "320x50": {
                        "impid": "div-criteo-1427001",
                        "zoneid": 1427001
                    },        
                    "320x100": {
                        "impid": "div-criteo-1427002",
                        "zoneid": 1427002
                    },        
                    "970x250": {
                        "impid": "div-criteo-1427565",
                        "zoneid": 1427565
                    },        
                };
                if (typeof zon[zoneSize] != "undefined") {
                    crtbid(zon,zoneSize,preset,ctkey);
                }
            }

        }
    }catch(err){
        console.log(err)
    }

    function crtbid(zon,zoneSize,preset,ctkey){
        var crtZone = zon[zoneSize];
        window.Criteo = window.Criteo || {};
        window.Criteo.events = window.Criteo.events || [];
        var launchAdServer = function(bids) {
            if (bids.length > 0) { //criteo bid
                fbList[fbList.length] = {
                    "cpm": Math.round(bids[0].cpm * 100000000000) / 100000000000,
                    "bider": "criteo",
                    "tag": '<script type="text/javascript" src="' + bids[0].displayUrl + '"><\/script>',
                    "impTag": "//ad.holmesmind.com/adserver/tp?tpid=" + crtZone.impid + "&tp=criteo&c=" + bids[0].cpm,
                    "w" : preset.size[ctkey]["width"],
                    "h" : preset.size[ctkey]["height"],                            
                }            
            }
        };
        Criteo.events.push(function() {
            Criteo.RequestBids({ 
                "placements": [{ "slotid": crtZone.impid, "zoneid": crtZone.zoneid }]
            }, launchAdServer, 2000);
        });
    }
})();