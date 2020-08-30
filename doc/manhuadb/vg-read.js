var pagination_key = 'pagination_num';
var ck_num = 0;
var is_webp = check_support_webp() ? 1 : 0;
var vg_r_data = $(".vg-r-data");
var img_data_arr = JSON.parse($.base64.decode(img_data));
var page = parseInt(vg_r_data.data("page"));
var total_page = parseInt(vg_r_data.data("total"));
var img_host = vg_r_data.data("host");
var img_pre = vg_r_data.data("img_pre");
var p_ccid = vg_r_data.data("ccid");
var p_id = vg_r_data.data("id");
var p_d = vg_r_data.data("d");
var pagination_num = 0;

var pagination_num_storage = localStorage.getItem(pagination_key);
if(pagination_num_storage) {
	pagination_num = pagination_num_storage;
}

$(function() { 
	
	vg_pagination(page, total_page);
	
	var img_list = [];
	for(let ida in img_data_arr) {
		if(img_data_arr[ida].p == page+1 || img_data_arr[ida].p == page+2 || img_data_arr[ida].p == page+3) {
			if(is_webp && img_data_arr[ida].img_webp) {
				img_list.push(img_host+img_pre+img_data_arr[ida].img_webp);
			} else {
				img_list.push(img_host+img_pre+img_data_arr[ida].img);
			}
		}
	}
	if (img_list.length > 0) {
		$.preload(img_list);
	}
	

	$(".relation-cc img").lazyload({
    	effect : "fadeIn"
    });
	
	if(page > 1) {
		scroll_top();
	}
	
	var sort = $(".sort");
	var type = 0;
	sort.click(function() {
		var sort_div = $(this).parent().parent().parent().find(".num_div");
		if(type == 0) {
			sortNum(sort_div, "desc");
			type = 1;
		} else {
			sortNum(sort_div, "asc");
			type = 0;
		}
	});
	
	$(document).keydown(function(event){
		if(event.which == 37) vg_pjax($(".pre").data("p"), 2);
		if(event.which == 39) vg_pjax($(".next").data("p"), 2);
	});
	
	//$(document).bind("contextmenu",function(){return false;});
});

var vg_pagination = (page, total) => {
	let pre_page = page - 1;
	let next_page = page + 1;
	let pre_status = !pre_page ? 'disabled' : '';
	
	if(pre_page <= 1) {
		pre_page = 1;
	}
	if(next_page >= total) {
		next_page = total;
	}
	
	let pagination = `
		<nav aria-label="Page navigation">
		<div class="form-inline">
		<a href="javascript:;" class="btn btn-primary mb-1 mr-1 d-flex" title="上集" onclick="fast_view($(this));"><input type="checkbox" class="mt-1 mr-1 chk" name="chk" value="1"/>极速</a>
		<a href="javascript:goNumPage('pre');" class="btn btn-primary mb-1 mr-1" title="上集">上集</a>
		<a data-p="${pre_page}" href="javascript:;" onclick="vg_pjax($(this));" class="btn btn-primary mb-1 ppre pre ${pre_status}" title="上一页">上页</a>
		<div class="mx-1 mb-1">
		<label for="page-selector" class="sr-only">翻页</label>
		<select class="form-control vg-page-selector" id="page-selector" onchange="vg_pjax($(this), 1);">
	`;
	for(var i = 1; i <= total; i++) {
		let i_state = i == page ? 'selected' : '';
		pagination += `<option value="${i}" ${i_state}>第${i}页</option>`;
	}
	pagination += `
		</select>
		</div>
		<a data-p="${next_page}" href="javascript:;" onclick="vg_pjax($(this));" class="btn btn-primary mb-1 pnext next" title="下一页">下页</a>
		<a href="javascript:goNumPage('next');" class="btn btn-primary mb-1 ml-1" title="下集">下集</a>
		</div>
		</nav>
	`
	$(".pagination").html(pagination);
	$(".chk").click(function(e){
		   fast_view($(this).parent());
	});
	if(pagination_num_storage) {
		$(".chk").prop("checked", true);
	}
}

function goNumPage(type, mid=0, cid=0, sid =0) {
	var current_num = parseInt(vg_r_data.data("num"));
	if(type == 'pre') {
		var go_num = current_num - 1;
	} else if(type == 'next') {
		var go_num = current_num + 1;
	}
	if(mid && cid && sid) {
		var ccid = cid;
		var id = sid;
		var d = mid;
	} else {
		var ccid = parseInt(p_ccid);
		var id = parseInt(p_id);
		var d = parseInt(p_d);
	}
	$.ajax({
		type:"post",
		url:"/book/goNumPage",
		data:{ccid:ccid, id:id, num:go_num, d:d, type:type},
		dataType:"json",
		success:function(json) {
			if(json.state == 0) {
				alert("没有了");
			} else {
				var url = json.url;
				window.location.href=url;
			}
		}
	});
}

var show_next_pic = (img_preload_url, p, result_container = ".pjax-container") => {
	$(result_container).find(".show-pic").attr("src", img_preload_url);
	$(".next").data("p", p+1);
	$(".pre").data("p", p-1);
	$(".vg-page-selector").val(p);
	$(".loading").hide();
}

var vg_pjax = (obj, type = 0, container = ".pjax-container") => {
	let result_container = container;
	let p;
	
	
	if(type == 1) {
		p = parseInt(obj.val());
	} else if(type == 2) {
		p = obj;
	} else {
		p = parseInt(obj.data('p'));
	}
	
	let push_url = vg_r_data.data("push_url");
	push_url = push_url.replace(".html", "_p"+p+".html");
	
	if(ck_num >= pagination_num) {
		window.location.href = push_url;
		return;
	}
	
	if(p <= 0) {
		goNumPage('pre', parseInt(p_d), p_ccid, parseInt(p_id));
		return;
	} else if(p > total_page) {
		alert('本章已完，前往下一章！');
		goNumPage('next', parseInt(p_d), p_ccid, parseInt(p_id));
		return;
	}
	
	scroll_top();
	
	var img = new Image();
	let img_preload_url = "";
	$(".loading").show();
	
	var local_img_list = img_data_arr;
	for(let sk in local_img_list) {
		if(p == local_img_list[sk].p) {
			if(is_webp && local_img_list[sk].img_webp) {
				img_preload_url = img_host+img_pre+local_img_list[sk].img_webp;
			} else {
				img_preload_url = img_host+img_pre+local_img_list[sk].img;
			}
		}
	}
	
	if ('history' in window && 'pushState' in history) {
		ck_num += 1;
		history.pushState(null, null, push_url);
		$(".c_nav_page").html(p);
		if(p <= 1) {
			$(".pre").addClass("disabled");
		} else {
			$(".pre").removeClass("disabled");
		}
	} else {
		window.location.href = push_url;
	}
	
	if(img_preload_url) {
		img.src = img_preload_url;
		if(img.complete) {
			show_next_pic(img.src, p);
		} else {
			img.onload = function() {
				show_next_pic(img.src, p);
			}
		}
	}
	
	if(img_data) {
		let current_img = "";
		let img_data_list = img_data_arr;
		var next_img_json = [];
		var preload_num = parseInt(vg_r_data.data("preload_num"));
		for(let d in img_data_list) {
			if(img_data_list[d].p == p+preload_num) {
				if(is_webp && img_data_list[d].img_webp) {
					next_img_json.push(img_host+img_pre+img_data_list[d].img_webp);
				} else {
					next_img_json.push(img_host+img_pre+img_data_list[d].img);
				}
			}
			
			if(img_data_list[d].p == p) {
				if(is_webp && img_data_list[d].img_webp) {
					current_img = img_host+img_pre+img_data_list[d].img_webp;
				} else {
					current_img = img_host+img_pre+img_data_list[d].img;
				}
			}
		}
		
		if(!img_preload_url) {
			var current_img_obj = new Image();
			current_img_obj.src = current_img;
			if(current_img_obj.complete) {
				show_next_pic(current_img_obj.src, p);
			} else {
				current_img_obj.onload = function() {
					show_next_pic(current_img_obj.src, p);
				}
			}
			var current_img_reload = [];
			current_img_reload.push(current_img);
			$.preload(current_img_reload);
			
		}
		
		if(next_img_json) {
			$.preload(next_img_json);
		}
	} else {
		$.ajax({
			type: 'get',
			url: "/book/viewpjax",
			data: {p:p, d: parseInt(p_d), ccid: parseInt(p_ccid), id: parseInt(p_id), is_webp: is_webp},
			dataType: 'json',
			success: function(json) {
				switch(json.state) {
					case 'first':
						goNumPage('pre', parseInt(p_d), p_ccid, parseInt(p_id));
						break;
					case 'end':
						alert('本章已完，前往下一章！');
						goNumPage('next', parseInt(p_d), p_ccid, parseInt(p_id));
						break;
					case 'page':
						if(!img_preload_url) {
							$(result_container).find(".show-pic").attr("src", json.data.pic);
							$(".next").data("p", p+1);
							$(".pre").data("p", p-1);
							$(".vg-page-selector").val(p);
							scroll_top();
							$(".loading").hide();
						}
						if(json.data.next_pic) {
							var next_img = [];
							next_img.push(json.data.next_pic);
							$.preload(next_img, {
								each: function() {
									//preload({img: json.data.next_pic, p: p+1}, p_id);
								},
								end: function() {}
							});
						}
						break;
				}
				
				
			}
		});
	}
}

var fast_view = (obj) => {
	let chk = $(".chk");
	let chk_status = chk.prop("checked");
	if(chk_status) {
		chk.prop("checked", false);
		localStorage.removeItem(pagination_key);
	} else {
		chk.prop("checked", true);
		localStorage.setItem(pagination_key, 5);
	}
}