package restores

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	restores_core "databasus-backend/internal/features/restores/core"
	users_middleware "databasus-backend/internal/features/users/middleware"
)

type RestoreController struct {
	restoreService            *RestoreService
	savedRestoreTargetService *SavedRestoreTargetService
}

func (c *RestoreController) RegisterRoutes(router *gin.RouterGroup) {
	router.GET("/restores/:backupId", c.GetRestores)
	router.POST("/restores/:backupId/restore", c.RestoreBackup)
	router.POST("/restores/cancel/:restoreId", c.CancelRestore)

	router.GET("/saved-restore-targets", c.GetSavedRestoreTargets)
	router.POST("/saved-restore-targets", c.CreateSavedRestoreTarget)
	router.PUT("/saved-restore-targets/:targetId", c.UpdateSavedRestoreTarget)
	router.DELETE("/saved-restore-targets/:targetId", c.DeleteSavedRestoreTarget)
}

// GetRestores
// @Summary Get restores for a backup
// @Description Get all restores for a specific backup
// @Tags restores
// @Produce json
// @Param backupId path string true "Backup ID"
// @Success 200 {array} restores_core.Restore
// @Failure 400
// @Failure 401
// @Router /restores/{backupId} [get]
func (c *RestoreController) GetRestores(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	backupID, err := uuid.Parse(ctx.Param("backupId"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid backup ID"})
		return
	}

	restores, err := c.restoreService.GetRestores(user, backupID)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, restores)
}

// RestoreBackup
// @Summary Restore a backup
// @Description Start a restore process for a specific backup
// @Tags restores
// @Param backupId path string true "Backup ID"
// @Success 200 {object} map[string]string
// @Failure 400
// @Failure 401
// @Router /restores/{backupId}/restore [post]
func (c *RestoreController) RestoreBackup(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	backupID, err := uuid.Parse(ctx.Param("backupId"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid backup ID"})
		return
	}

	var requestDTO restores_core.RestoreBackupRequest
	if err := ctx.ShouldBindJSON(&requestDTO); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.restoreService.RestoreBackupWithAuth(user, backupID, requestDTO); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "restore started successfully"})
}

// CancelRestore
// @Summary Cancel an in-progress restore
// @Description Cancel a restore that is currently in progress
// @Tags restores
// @Param restoreId path string true "Restore ID"
// @Success 204
// @Failure 400
// @Failure 401
// @Router /restores/cancel/{restoreId} [post]
func (c *RestoreController) CancelRestore(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	restoreID, err := uuid.Parse(ctx.Param("restoreId"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid restore ID"})
		return
	}

	if err := c.restoreService.CancelRestore(user, restoreID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.Status(http.StatusNoContent)
}

func (c *RestoreController) GetSavedRestoreTargets(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	targets, err := c.savedRestoreTargetService.GetSavedTargets(user)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, targets)
}

func (c *RestoreController) CreateSavedRestoreTarget(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req restores_core.CreateSavedRestoreTargetRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	target, err := c.savedRestoreTargetService.CreateSavedTarget(user, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, target)
}

func (c *RestoreController) UpdateSavedRestoreTarget(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	targetID, err := uuid.Parse(ctx.Param("targetId"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid target ID"})
		return
	}

	var req restores_core.UpdateSavedRestoreTargetRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	target, err := c.savedRestoreTargetService.UpdateSavedTarget(user, targetID, &req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, target)
}

func (c *RestoreController) DeleteSavedRestoreTarget(ctx *gin.Context) {
	user, ok := users_middleware.GetUserFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	targetID, err := uuid.Parse(ctx.Param("targetId"))
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid target ID"})
		return
	}

	if err := c.savedRestoreTargetService.DeleteSavedTarget(user, targetID); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.Status(http.StatusNoContent)
}
