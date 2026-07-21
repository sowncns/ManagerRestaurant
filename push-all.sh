#!/usr/bin/env bash
# Push 1 lan:
#   origin (ManagerRestaurant) <- full monorepo (be + fe), nhanh $BRANCH
#   da     (DA)                <- backend/ day len nhanh dong bo 'monorepo-backend'
#
# GIU lich su DA: KHONG ghi de da/main. Sau khi chay, vao GitHub DA mo PR
# 'monorepo-backend' -> 'main' va merge (tao merge commit, history DA con nguyen).
#
# Dung: ./push-all.sh            (main)
#       ./push-all.sh <branch>
set -e

BRANCH="${1:-main}"
SYNC_BRANCH="monorepo-backend"   # nhanh dong bo tren DA (chi backend), nguoi khac dung commit truc tiep

echo ">> [1/2] Push monorepo -> origin/$BRANCH"
git push origin "$BRANCH"

echo ">> [2/2] Split backend/ va day -> da/$SYNC_BRANCH"
# Split lai moi lan (lich su chi-backend), day de len nhanh dong bo.
# --force-with-lease an toan: chi la nhanh dong bo dung mot chieu, khong phai da/main.
git branch -D _backend_split 2>/dev/null || true
git subtree split --prefix=backend "$BRANCH" -b _backend_split
git push da _backend_split:"$SYNC_BRANCH" --force-with-lease
git branch -D _backend_split

echo
echo ">> Xong."
echo "   - origin/$BRANCH: full monorepo."
echo "   - da/$SYNC_BRANCH: backend moi nhat."
echo "   -> Mo PR tren GitHub DA: '$SYNC_BRANCH' -> 'main', bam Merge de dua ve (giu history)."
