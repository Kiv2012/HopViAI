/**
 * HỢP VỊ AI - BỘ XỬ LÝ RÀNG BUỘC & TỔ HỢP MÓN ĂN (CONSTRAINT & MAXIMIN SOLVER)
 * Thực thi đúng nguyên tắc tại Mục 4.3.2, 4.3.3, 4.3.5 và 6.3 trong Bản mô tả chi tiết:
 * 1. Chỉ sử dụng dữ liệu quán và thực đơn đã được Admin phê duyệt (status === 'approved').
 * 2. Tính toán tổng chi phí bằng chương trình chính xác 100%, không để AI tự cộng tiền.
 * 3. Xếp hạng tổ hợp cho nhóm theo nguyên tắc Công bằng nhóm (Maximin Fairness):
 *    - Ưu tiên 1: Điểm phù hợp của thành viên thấp nhất trong nhóm cao hơn (Max of Min Score).
 *    - Ưu tiên 2: Tổng điểm phù hợp của cả nhóm cao hơn (Max of Total Score).
 *    - Ưu tiên 3: Tổng chi phí thấp hơn (Min of Total Cost).
 * 4. Khi không có phương án hợp lệ: Phân biệt rõ "Chưa đủ dữ liệu" vs "Không có phương án thỏa mãn ràng buộc"
 *    và tính toán Phương án điều chỉnh ngân sách gần nhất (Relaxed Budget Scenario).
 */

function normalizeVi(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Chấm điểm mức độ phù hợp S(member, dish) trong thang [0..100]
 */
function scoreMemberDish(member, dish) {
  let score = 50; // Điểm cơ sở cho một món ăn hợp lệ
  const reasons = [];

  const prefType = member.preferredType || 'any'; // mon_nuoc | mon_kho | com | chay | an_vat | goi | lau | any
  const prefFlavor = member.flavor || 'any'; // vi_cay | vi_thanh | any
  const keywords = (member.keywords || []).map(k => k.toLowerCase().trim()).filter(Boolean);
  const dishNameLower = dish.name.toLowerCase();
  const dishNameNorm = normalizeVi(dish.name);
  const tags = dish.tags || [];

  // 1. Kiểm tra chế độ ăn chay (ràng buộc cứng nếu người dùng yêu cầu ăn chay)
  if (prefType === 'chay' || member.isVegetarian) {
    if (tags.includes('chay')) {
      score += 35;
      reasons.push('Đúng món chay');
    } else {
      return { score: 0, matched: false, reasons: ['Không phải món chay'] };
    }
  }

  // 2. Kiểm tra loại món chính (nước / khô / cơm / ăn vặt / gỏi / lẩu)
  if (prefType && prefType !== 'any' && prefType !== 'chay') {
    if (prefType === 'mon_nuoc') {
      if (tags.includes('mon_nuoc') || dish.category === 'mon_nuoc') {
        score += 30;
        reasons.push('Đúng sở thích món nước');
      } else {
        score -= 35;
      }
    } else if (prefType === 'com') {
      if (tags.includes('com') || dish.category === 'com') {
        score += 30;
        reasons.push('Đúng sở thích cơm');
      } else {
        score -= 35;
      }
    } else if (prefType === 'mon_kho') {
      if (tags.includes('mon_kho') && !tags.includes('com')) {
        score += 30;
        reasons.push('Đúng sở thích món khô/trộn');
      } else if (tags.includes('mon_kho')) {
        score += 22;
        reasons.push('Phù hợp nhóm món khô');
      } else {
        score -= 30;
      }
    } else if (prefType === 'an_vat') {
      if (tags.includes('an_vat')) {
        score += 30;
        reasons.push('Đúng nhóm ăn vặt');
      } else {
        score -= 25;
      }
    } else if (prefType === 'lau') {
      if (tags.includes('lau') || dish.category === 'lau') {
        score += 30;
        reasons.push('Đúng sở thích món lẩu');
      } else {
        score -= 30;
      }
    } else if (prefType === 'goi') {
      if (tags.includes('goi') || dish.category === 'goi') {
        score += 30;
        reasons.push('Đúng sở thích món gỏi');
      } else {
        score -= 25;
      }
    }
  }

  // 3. Kiểm tra từ khóa món ăn hoặc nguyên liệu cụ thể (bún, mì, hủ tiếu, gà, bò, hải sản, bưởi, chả lụi, cháo...)
  for (const kw of keywords) {
    const kwNorm = normalizeVi(kw);
    if (dishNameLower.includes(kw) || dishNameNorm.includes(kwNorm)) {
      score += 20;
      reasons.push(`Khớp món "${kw}"`);
    } else if (
      (kwNorm.includes('bun') && tags.includes('bun')) ||
      ((kwNorm.includes('mi') || kwNorm.includes('udon')) && tags.includes('mi')) ||
      (kwNorm.includes('hu tieu') && tags.includes('hu_tieu')) ||
      (kwNorm.includes('chao') && tags.includes('chao')) ||
      (kwNorm.includes('ga') && tags.includes('ga')) ||
      (kwNorm.includes('bo') && tags.includes('bo')) ||
      ((kwNorm.includes('hai san') || kwNorm.includes('tom') || kwNorm.includes('ca') || kwNorm.includes('oc') || kwNorm.includes('hen')) && tags.includes('hai_san')) ||
      (kwNorm.includes('buoi') && dishNameNorm.includes('buoi'))
    ) {
      score += 15;
      reasons.push(`Phù hợp thành phần "${kw}"`);
    } else {
      score -= 12;
    }
  }

  // 4. Kiểm tra hương vị (cay / thanh)
  if (prefFlavor && prefFlavor !== 'any') {
    if (prefFlavor === 'vi_cay' && tags.includes('vi_cay')) {
      score += 10;
      reasons.push('Hợp vị cay/đậm đà');
    } else if (prefFlavor === 'vi_thanh' && tags.includes('vi_thanh')) {
      score += 10;
      reasons.push('Hợp vị thanh nhẹ');
    } else {
      score -= 8;
    }
  }

  // Chuẩn hóa trong đoạn [5..100]
  const clamped = Math.max(5, Math.min(100, score));
  if (reasons.length === 0 && clamped >= 50) {
    reasons.push('Phù hợp tiêu chuẩn bữa ăn');
  }

  return {
    score: clamped,
    matched: clamped >= 45,
    reasons
  };
}

/**
 * Tìm tổ hợp món tốt nhất tại 1 quán cho danh sách thành viên
 */
function buildPlansForRestaurant(restaurant, dishes, requirements, enforceBudget = true) {
  const partySize = Math.max(1, Math.min(6, Number(requirements.partySize) || 1));
  const maxBudget = Number(requirements.maxBudget) || 0;
  const members = Array.isArray(requirements.members) && requirements.members.length > 0
    ? requirements.members.slice(0, partySize)
    : Array.from({ length: partySize }, (_, i) => ({
        label: `Người ${i + 1}`,
        preferredType: 'any',
        flavor: 'any',
        keywords: []
      }));

  while (members.length < partySize) {
    members.push({
      label: `Người ${members.length + 1}`,
      preferredType: 'any',
      flavor: 'any',
      keywords: []
    });
  }

  // Tách món cá nhân (1 người) và món dùng chung / combo nhóm
  const individualDishes = dishes.filter(d => !d.isSharedCombo || d.portionMin === 1);
  const sharedDishes = dishes.filter(d => d.isSharedCombo && d.portionMax >= partySize && d.portionMin <= partySize + 1);

  const candidatePlans = [];

  // NHÁNH A: Mỗi thành viên 1 suất ăn riêng tại cùng quán
  if (individualDishes.length > 0) {
    // Với mỗi thành viên, lấy Top 6 món điểm cao nhất tại quán để tránh bùng nổ tổ hợp nhưng vẫn đảm bảo vét cạn phương án tốt
    const memberCandidates = members.map(m => {
      const scored = individualDishes.map(dish => {
        const evalRes = scoreMemberDish(m, dish);
        return { dish, ...evalRes };
      });
      scored.sort((a, b) => b.score - a.score || a.dish.price - b.dish.price);
      return scored.slice(0, 6);
    });

    function backtrack(idx, currentAssignments, currentCost) {
      if (enforceBudget && maxBudget > 0 && currentCost > maxBudget) {
        return;
      }
      if (idx === partySize) {
        // Kiểm tra tất cả thành viên đều có mức đáp ứng tối thiểu (>= 40)
        const scores = currentAssignments.map(a => a.score);
        const minScore = Math.min(...scores);
        const totalScore = scores.reduce((s, v) => s + v, 0);
        const avgScore = Math.round(totalScore / partySize);

        // Nếu có người bị ép ăn món trái hoàn toàn sở thích (score < 40), đánh dấu không thỏa mãn sở thích
        const allSatisfied = scores.every(s => s >= 45);

        candidatePlans.push({
          planType: 'individual_meals',
          restaurant,
          assignments: currentAssignments.map((a, i) => ({
            memberIndex: i + 1,
            memberLabel: members[i].label || `Người ${i + 1}`,
            dishId: a.dish.id,
            dishName: a.dish.name,
            imageUrl: a.dish.imageUrl || '',
            price: a.dish.price,
            rawPriceText: a.dish.rawPriceText,
            unit: a.dish.unit,
            priceStatus: a.dish.priceStatus,
            priceNote: a.dish.priceNote,
            score: a.score,
            reasons: a.reasons
          })),
          totalCost: currentCost,
          remainingBudget: maxBudget > 0 ? maxBudget - currentCost : null,
          minMemberScore: minScore,
          totalGroupScore: totalScore,
          averageScore: avgScore,
          allPreferencesSatisfied: allSatisfied
        });
        return;
      }

      for (const cand of memberCandidates[idx]) {
        currentAssignments.push(cand);
        backtrack(idx + 1, currentAssignments, currentCost + cand.dish.price);
        currentAssignments.pop();
      }
    }

    backtrack(0, [], 0);
  }

  // NHÁNH B: Món Combo nhóm hoặc Lẩu dùng chung (nếu nhóm >= 2 người và các thành viên có chung nhu cầu hoặc muốn ăn lẩu/combo/đặc sản)
  if (partySize >= 2 && sharedDishes.length > 0) {
    for (const sDish of sharedDishes) {
      const totalCost = sDish.unit === 'người' ? sDish.price * partySize : sDish.price;
      if (enforceBudget && maxBudget > 0 && totalCost > maxBudget) continue;

      const memberEvals = members.map((m, i) => {
        const evalRes = scoreMemberDish(m, sDish);
        return {
          memberIndex: i + 1,
          memberLabel: m.label || `Người ${i + 1}`,
          dishId: sDish.id,
          dishName: `${sDish.name} (Phần dùng chung ${partySize} người)`,
          imageUrl: sDish.imageUrl || '',
          price: i === 0 ? totalCost : 0,
          displayPrice: i === 0 ? `${totalCost.toLocaleString('vi-VN')}đ (Cả nhóm)` : 'Dùng chung combo/lẩu',
          rawPriceText: sDish.rawPriceText,
          unit: sDish.unit,
          priceStatus: sDish.priceStatus,
          priceNote: sDish.priceNote,
          score: evalRes.score,
          reasons: [...evalRes.reasons, `Khẩu phần nhóm (${sDish.portionMin}–${sDish.portionMax} người)`]
        };
      });

      const scores = memberEvals.map(e => e.score);
      const minScore = Math.min(...scores);
      const totalScore = scores.reduce((s, v) => s + v, 0);
      const allSatisfied = scores.every(s => s >= 45);

      candidatePlans.push({
        planType: 'shared_combo',
        restaurant,
        assignments: memberEvals,
        totalCost,
        remainingBudget: maxBudget > 0 ? maxBudget - totalCost : null,
        minMemberScore: minScore,
        totalGroupScore: totalScore,
        averageScore: Math.round(totalScore / partySize),
        allPreferencesSatisfied: allSatisfied
      });
    }
  }

  return candidatePlans;
}

/**
 * Sắp xếp các phương án theo nguyên tắc Công bằng nhóm (Maximin Fairness - Mục 4.3.3):
 * 1. Phương án thỏa mãn sở thích tất cả thành viên (allPreferencesSatisfied)
 * 2. Điểm phù hợp thấp nhất trong nhóm cao hơn (minMemberScore DESC)
 * 3. Tổng điểm phù hợp của nhóm cao hơn (totalGroupScore DESC)
 * 4. Tối ưu sát ngân sách: Ưu tiên phương án sát với mức ngân sách yêu cầu nhất (diff to maxBudget ASC)
 * 5. Tổng chi phí thấp hơn (totalCost ASC)
 */
function sortPlansByMaximin(plans, maxBudget = 0) {
  return plans.sort((a, b) => {
    if (a.allPreferencesSatisfied !== b.allPreferencesSatisfied) {
      return a.allPreferencesSatisfied ? -1 : 1;
    }
    if (b.minMemberScore !== a.minMemberScore) {
      return b.minMemberScore - a.minMemberScore;
    }
    if (b.totalGroupScore !== a.totalGroupScore) {
      return b.totalGroupScore - a.totalGroupScore;
    }
    if (maxBudget > 0) {
      const diffA = Math.abs(maxBudget - a.totalCost);
      const diffB = Math.abs(maxBudget - b.totalCost);
      if (diffA !== diffB) return diffA - diffB;
    }
    return a.totalCost - b.totalCost;
  });
}

/**
 * Hàm giải bài toán chính
 */
function solveMealRecommendations(database, requirements) {
  const startTime = Date.now();
  const partySize = Math.max(1, Math.min(6, Number(requirements.partySize) || 1));
  const maxBudget = Number(requirements.maxBudget) || 0;
  const requestedArea = (requirements.area || '').trim();

  // 1. Chỉ lấy quán và món đã được Admin phê duyệt (Mục 5.4 & 6.6)
  const approvedRestaurants = (database.restaurants || []).filter(r => r.status === 'approved');
  const approvedMenuItems = (database.menuItems || []).filter(m => m.status === 'approved');

  // 2. Kiểm tra điều kiện khu vực (nếu người dùng chỉ định khu vực cụ thể)
  let filteredRestaurants = approvedRestaurants;
  if (requestedArea && requestedArea.toLowerCase() !== 'tất cả' && requestedArea.toLowerCase() !== 'all' && requestedArea.toLowerCase() !== 'đồng nai' && requestedArea.toLowerCase() !== 'biên hòa') {
    const normReqArea = normalizeVi(requestedArea);
    filteredRestaurants = approvedRestaurants.filter(r =>
      normalizeVi(r.area).includes(normReqArea) || normalizeVi(r.address).includes(normReqArea)
    );

    if (filteredRestaurants.length === 0) {
      return {
        status: 'insufficient_data',
        executionTimeMs: Date.now() - startTime,
        summary: `Chưa có dữ liệu thực đơn đã xác minh tại khu vực "${requestedArea}". Hiện hệ thống mới có dữ liệu đã kiểm duyệt tại: Trấn Biên, Tam Hiệp, Tân Triều, Bửu Long, Thanh Bình, Thống Nhất.`,
        plans: [],
        alternativeScenario: null,
        verifiedAreas: Array.from(new Set(approvedRestaurants.map(r => r.area)))
      };
    }
  }

  // 3. Duyệt từng quán để tìm tổ hợp hợp lệ trong ngân sách
  let allValidPlans = [];
  for (const rest of filteredRestaurants) {
    const restDishes = approvedMenuItems.filter(m => m.restaurantId === rest.id);
    if (restDishes.length === 0) continue;

    const plansForRest = buildPlansForRestaurant(rest, restDishes, requirements, true);
    // Chọn tối đa 2 phương án tốt nhất ở mỗi quán để Top 3 đa dạng hoặc so sánh trực tiếp
    sortPlansByMaximin(plansForRest, maxBudget);
    const qualified = plansForRest.filter(p => p.allPreferencesSatisfied);
    if (qualified.length > 0) {
      allValidPlans.push(...qualified.slice(0, 2));
    }
  }

  sortPlansByMaximin(allValidPlans, maxBudget);

  // Loại bỏ phương án trùng lặp hoàn toàn tại cùng 1 quán
  const topPlans = [];
  const seenSignatures = new Set();
  for (const p of allValidPlans) {
    const sig = `${p.restaurant.id}:${p.assignments.map(a => a.dishId).sort().join(',')}`;
    if (!seenSignatures.has(sig)) {
      seenSignatures.add(sig);
      topPlans.push(p);
    }
    if (topPlans.length >= 3) break;
  }

  if (topPlans.length > 0) {
    return {
      status: 'success',
      executionTimeMs: Date.now() - startTime,
      summary: `Tìm thấy ${topPlans.length} phương án tối ưu đáp ứng đầy đủ ${partySize} người${maxBudget > 0 ? ` trong ngân sách ${maxBudget.toLocaleString('vi-VN')}đ` : ''}.`,
      plans: topPlans,
      alternativeScenario: null
    };
  }

  // 4. XỬ LÝ KHI KHÔNG TÌM ĐƯỢC PHƯƠNG ÁN HỢP LỆ (Mục 4.3.5)
  // Tìm phương án thỏa mãn sở thích các thành viên nhưng không giới hạn ngân sách để tính chi phí tối thiểu cần điều chỉnh
  let relaxedPlans = [];
  for (const rest of filteredRestaurants) {
    const restDishes = approvedMenuItems.filter(m => m.restaurantId === rest.id);
    if (restDishes.length === 0) continue;
    const plansNoBudget = buildPlansForRestaurant(rest, restDishes, requirements, false);
    const satisfiedPlans = plansNoBudget.filter(p => p.allPreferencesSatisfied);
    relaxedPlans.push(...satisfiedPlans);
  }

  // Ưu tiên phương án đáp ứng đủ sở thích có tổng chi phí thấp nhất
  relaxedPlans.sort((a, b) => a.totalCost - b.totalCost || b.minMemberScore - a.minMemberScore);

  if (relaxedPlans.length > 0 && maxBudget > 0 && relaxedPlans[0].totalCost > maxBudget) {
    const bestAlt = relaxedPlans[0];
    const extraNeeded = bestAlt.totalCost - maxBudget;
    return {
      status: 'no_valid_solution_budget',
      executionTimeMs: Date.now() - startTime,
      summary: `Không có tổ hợp nào trong dữ liệu hiện có đáp ứng đồng thời sở thích của ${partySize} người tại cùng một quán với ngân sách tối đa ${maxBudget.toLocaleString('vi-VN')}đ.`,
      plans: [],
      alternativeScenario: {
        reason: 'Ngân sách hiện tại thấp hơn tổng giá tối thiểu của các món phù hợp tại cùng một quán.',
        suggestedBudget: bestAlt.totalCost,
        extraAmountNeeded: extraNeeded,
        message: `Phương án đáp ứng yêu cầu món và cùng quán có tổng giá thấp nhất là ${bestAlt.totalCost.toLocaleString('vi-VN')} đồng (tại quán ${bestAlt.restaurant.name}), cao hơn ngân sách ${maxBudget.toLocaleString('vi-VN')} đồng là ${extraNeeded.toLocaleString('vi-VN')} đồng.`,
        plan: bestAlt
      }
    };
  }

  // Trường hợp xung đột sở thích tại cùng 1 quán (ví dụ: 1 người đòi ăn chay hoàn toàn, 1 người đòi lẩu tôm mặn ở cùng 1 quán chuyên biệt)
  return {
    status: 'no_valid_solution_constraints',
    executionTimeMs: Date.now() - startTime,
    summary: `Trong phạm vi ${filteredRestaurants.length} quán đã xác minh${requestedArea ? ` tại ${requestedArea}` : ''}, chưa có quán nào có thực đơn đáp ứng đồng thời tất cả điều kiện món ăn của từng thành viên tại cùng một địa điểm.`,
    plans: [],
    alternativeScenario: {
      reason: 'Các quán hiện có chuyên biệt theo nhóm món (ví dụ quán chuyên đồ chay hoặc chuyên 1 món đặc sản) nên chưa gom đủ các món khác biệt trong cùng một quán.',
      message: 'Bạn có thể cân nhắc mở rộng khu vực tìm kiếm sang toàn TP. Biên Hòa hoặc nới lỏng loại món ưu tiên của một thành viên.'
    }
  };
}

module.exports = {
  solveMealRecommendations,
  scoreMemberDish,
  normalizeVi
};

